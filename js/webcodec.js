

let cnv = document.getElementById('dst');
let ctx = cnv.getContext('2d', { alpha: false });
let ready_frames = [];
let underflow = true;
let time_base = 0;
let frame_time = 100; // in milliseconds
let handle_count = 0;
let render_count = 0;
var asset;

function handleFrame(frame) {
    console.log('handling frame ' + handle_count);
    handle_count++;
    ready_frames.push(frame);
    if (underflow)
        setTimeout(render_frame, 0);
}

function delay(time_ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, time_ms);
    });
}

function calculateTimeTillNextFrame(timestamp) {
    if (time_base == 0)
        time_base = performance.now();

    let media_time = performance.now() - time_base;
    return Math.max(0, (timestamp / 1000) - media_time);
}

async function render_frame() {
    console.log('rendering frame ' + render_count);
    render_count++;
    if (ready_frames.length == 0) {
        underflow = true;
        return;
    }
    let frame = ready_frames.shift();
    underflow = false;

    let bitmap = await frame.createImageBitmap();
    //console.log(frame_time);
    // Based on the frame's timestamp calculate how much of real time waiting
    // is needed before showing the next frame.
    //let time_till_next_frame = calculateTimeTillNextFrame(frame_time);
    //console.log(time_till_next_frame);
    await delay(frame_time);
    ctx.drawImage(bitmap, 0, 0);

    // Immediately schedule rendering of the next frame
    setTimeout(render_frame, 0);
    frame.destroy();
}

function loadVideo(assetURL) {
    var xhr = new XMLHttpRequest;
    xhr.open('get', assetURL);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function () { 
        asset = xhr.response;
        decodeVideo();
    };
    xhr.send();
}

async function decodeVideo() {
    if ("VideoDecoder" in window) {
        const init = {
            output : handleFrame,
            error: (e) => {
                console.log(e.message);
            }
        };

        const config = {
            codec: "avc1.640015",
            description : new Uint8Array(// avcC atom from MP4 containing SPS and PPS
            [ 
                0x01, 0x64, 0x00, 0x0B, 0xFF, 0xE1, 0x00, 0x18, 0x67, 0x64, 
                0x00, 0x0B, 0xAC, 0xD9, 0x42, 0x4D, 0xF8, 0x88, 0x40, 0x00, 
                0x00, 0x03, 0x00, 0x40, 0x00, 0x00, 0x0F, 0x03, 0xC5, 0x0A, 
                0x65, 0x80, 0x01, 0x00, 0x05, 0x68, 0xEB, 0xEC, 0xB2, 0x2C
            ]), 
            codedWidth: 144,
            codedHeight: 82,
        };

        let decoder = new VideoDecoder(init);
        decoder.configure(config);
        
        console.log('creating encoded video chunk');

        let chunk = new EncodedVideoChunk({
            timestamp: frame_time,
            data : asset
        });

        handle_count = 0;
        render_count = 0;

        decoder.decode(chunk);
        
        await decoder.flush();
    } else {
        document.body.innerHTML = "<h1>WebCodecs API is not supported.</h1>";
        return;
    }
}

//document.body.onload = loadVideo;