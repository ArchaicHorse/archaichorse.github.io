let readyFrames = [];
let underflow = true;
let handleCount = 0;
let renderCount = 0;
let statsDisplayed = false;
let canvID = "";
let frameTime = 50; // in milliseconds

function displayStats(frame){
    let cnv = document.getElementById('dst' + canvID);
    try {
        document.getElementById('frame_count' + canvID).innerHTML = "Frame #: " + renderCount;
        document.getElementById("coded_width" + canvID).innerHTML = "codedWidth: " + frame.codedWidth;
        document.getElementById("coded_height" + canvID).innerHTML = "codedHeight: " + frame.codedHeight;
        document.getElementById("display_width" + canvID).innerHTML = "displayWidth: " + frame.displayWidth;
        document.getElementById("display_height" + canvID).innerHTML = "displayHeight: " + frame.displayHeight;

        cnv.width = frame.displayWidth;
        cnv.height = frame.displayHeight;
    } catch(err) {
        document.getElementById('filename' + canvID).innerHTML = "Error: " + err.message;
    }
}

function handleFrame(frame) {
    console.log('handling frame ' + handleCount);
    handleCount++;
    readyFrames.push(frame);
    if (underflow)
        setTimeout(renderFrame, 0);
}

function handleSingleFrame(frame) {
    if (handleCount == 0) {
        console.log('handleSingleFrame: ' + handleCount);
        handleCount++;

        readyFrames.push(frame);
        if (underflow)
            setTimeout(renderFrame, 0);
    } else {
        console.log('handleSingleFrame: skipping')
    }
}

function delay(time_ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, time_ms);
    });
}

async function renderFrame() {
    if (readyFrames.length == 0) {
        console.log('renderFrame: no frames to render');
        underflow = true;
        return;
    }
    console.log('renderFrame: rendering frame ' + renderCount);
    renderCount++;

    let frame = readyFrames.shift();
    underflow = false;

    let bitmap = await frame.createImageBitmap();
    
    await delay(frameTime);
    if (!statsDisplayed) {
        displayStats(frame);
        statsDisplayed = true;
    } else {
        // just update the frame count
        document.getElementById('frame_count' + canvID).innerHTML = "Frame #: " + renderCount;
    }
    let cnv = document.getElementById('dst' + canvID);
    let ctx = cnv.getContext('2d', { alpha: false });

    ctx.drawImage(bitmap, 0, 0);

    // Immediately schedule rendering of the next frame
    setTimeout(renderFrame, 0);
    frame.close();
}

async function decodeVideo(assetURL, avcC, curID="") {
    if ("VideoDecoder" in window) {
        canvID = curID;
        let cnv = document.getElementById('dst' + canvID);
        const init = {
            output : handleFrame,
            error: (e) => {
                console.log(e.message);
            }
        };

        // il only outputs one frame
        if (assetURL == '264/il_avcc.264') {
            init.output = handleSingleFrame;
        }

        const config = {
            codec: "avc1.64000a",
            description : avcC, 
            codedWidth: cnv.width,
            codedHeight: cnv.height,
        };

        let decoder = new VideoDecoder(init);
        decoder.configure(config);

        console.log('creating encoded video chunk');

        (await fetch(assetURL)).arrayBuffer().then(async function(buffer) {
            let chunk = new EncodedVideoChunk({
                type : "key",
                timestamp: frameTime,
                data : buffer,
            });
    
            handleCount = 0;
            renderCount = 0;
            statsDisplayed = false;
    
            decoder.decode(chunk);
            
            await decoder.flush();
        });


    } else {
        document.body.innerHTML = "<h1>WebCodecs API is not supported.</h1>";
        return;
    }
}