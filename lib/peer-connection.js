import EventEmitter from 'events';
import Sockets from '../lib/socketeer';

let myPeerConnection;
let userId;
let partnerId;
let sockets;
const myHostname = "localhost";

const mediaConstraints = {
    audio: true,            // We want an audio track
    video: {
        aspectRatio: {
            ideal: 1.333333     // 3:2 aspect is preferred
        }
    }
};

export const events = new EventEmitter();

// Create the RTCPeerConnection which knows how to talk to our
// selected STUN/TURN server and then uses getUserMedia() to find
// our camera and microphone and add that stream to the connection for
// use in our video call. Then we configure event handlers to get
// needed notifications on the call.
export async function create(_userId, _partnerId) {
    userId = _userId;
    partnerId = _partnerId;

    myPeerConnection = new RTCPeerConnection({
        iceServers: [     // Information about ICE servers - Use your own!
            {
                urls: "turn:" + myHostname,  // A TURN server
                username: "webrtc",
                credential: "turnserver"
            },
            {
                urls: "stun:openrelay.metered.ca:80",
            },
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
            {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
        ]
        // iceServers: [
        //   {
        //     urls: "stun:openrelay.metered.ca:80",
        //   },
        //   {
        //     urls: "turn:openrelay.metered.ca:80",
        //     username: "openrelayproject",
        //     credential: "openrelayproject",
        //   },
        //   {
        //     urls: "turn:openrelay.metered.ca:443",
        //     username: "openrelayproject",
        //     credential: "openrelayproject",
        //   },
        //   {
        //     urls: "turn:openrelay.metered.ca:443?transport=tcp",
        //     username: "openrelayproject",
        //     credential: "openrelayproject",
        //   },
        // ],
    });

    // Set up event handlers for the ICE negotiation process.

    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
    myPeerConnection.ontrack = handleTrackEvent;

    sockets = new Sockets();
    sockets.listen(`${partnerId}-${userId}`);
    sockets.events.on('video-offer', message => {
        handleVideoOfferMsg(message.message);
    })
    sockets.events.on('video-answer', message => {
        handleVideoAnswerMsg(message.message);
    })
    sockets.events.on('new-ice-candidate', message => {
        handleNewICECandidateMsg(message.message);
    })
}

export function get() {
    return myPeerConnection;
}

// Called by the WebRTC layer to let us know when it's time to
// begin, resume, or restart ICE negotiation.
const handleNegotiationNeededEvent = async () => {
    //console.log("*** Negotiation needed");
    try {
        //console.log("---> Creating offer");
        const offer = await myPeerConnection.createOffer();

        // If the connection hasn't yet achieved the "stable" state,
        // return to the caller. Another negotiationneeded event
        // will be fired when the state stabilizes.

        if (myPeerConnection.signalingState !== "stable") {
            //console.log("     -- The connection isn't stable yet; postponing...")
            return;
        }

        // Establish the offer as the local peer's current
        // description.

        // //console.log("---> Setting local description to the offer"); 
        await myPeerConnection.setLocalDescription(offer);

        // Send the offer to the remote peer. video-offer

        //console.log("---> Sending the video-offer to the remote peer ", myPeerConnection.localDescription);
        console.log(userId, "is sending a video offer to", partnerId, myPeerConnection.localDescription)
        if (userId === 'user1') {

            const messageType = "video-offer";
            const message = {
                name: userId, // myID needs to be my s3 bucket key > will be added to 
                target: partnerId, // targetID needs to be my partners s3 bucket key
                type: "video-offer",
                body: myPeerConnection.localDescription, // body
            };
            await sockets.send(`${userId}-${partnerId}`, messageType, message)

            // await sendToS3({
            //     name: userId, // myID needs to be my s3 bucket key > will be added to 
            //     target: partnerId, // targetID needs to be my partners s3 bucket key
            //     type: "video-offer", // type will be added to the key 
            //     body: myPeerConnection.localDescription // body
            // });
            // await checkForStuff(`${userId}/currentPartner`)
        }
    } catch (err) {
        //console.log("*** The following error occurred while handling the negotiationneeded event:");
        reportError(err);
    };
}

// Called by the WebRTC layer when events occur on the media tracks on our WebRTC call.
// This includes when streams are added to and removed from the call.
//
// track events include the following fields:
//
// RTCRtpReceiver       receiver
// MediaStreamTrack     track
// MediaStream[]        streams
// RTCRtpTransceiver    transceiver
//
// In our case, we're just taking the first stream found and attaching it to the <video> element for incoming media.

const handleTrackEvent = (event) => {
    console.log("HandleTrackEvent", event.streams[0]);
    events.emit('partner.stream.received', event.streams[0])
}

// Handles |icecandidate| events by forwarding the specified
// ICE candidate (created by our local ICE agent) to the other
// peer through the signaling server.

const handleICECandidateEvent = async (event) => {

    if (event.candidate && userId === 'user2') {
        // console.log("*** Outgoing ICE candidate: " + event);
        console.log(userId, "is now sending new-ice-candidates to ", partnerId, event.candidate)


        // ff here
        await sockets.send(`${userId}-${partnerId}`, 'new-ice-candidate', {
            name: userId, // myID needs to be my s3 bucket key > will be added to 
            target: partnerId, // my partner's id in AWS
            type: "new-ice-candidate", // to be added to the key 
            body: event.candidate
        });
    }
}

// Handle |iceconnectionstatechange| events. This will detect when the ICE connection is closed, failed, or disconnected.
// This is called when the state of the ICE agent changes.

const handleICEConnectionStateChangeEvent = (event) => {
    console.log("*** ICE connection state changed to " + myPeerConnection.iceConnectionState);

    switch (myPeerConnection.iceConnectionState) {
        case "closed":
        case "failed":
        case "disconnected":
            //console.log('VIDEO CALL CLOOOOOSED')
            hangUpCall();
            break;
    }
}

// Set up a |signalingstatechange| event handler. This will detect when
// the signaling connection is closed.
//
// NOTE: This will actually move to the new RTCPeerConnectionState enum returned in the property RTCPeerConnection.connectionState when browsers catch up with the latest version of the specification!

const handleSignalingStateChangeEvent = (event) => {
    console.log("*** WebRTC signaling state changed to: " + myPeerConnection.signalingState);
    switch (myPeerConnection.signalingState) {
        case "closed":
            closeVideoCall();
            break;
    }
}

// Handle the |icegatheringstatechange| event. This lets us know what the
// ICE engine is currently working on: "new" means no networking has happened
// yet, "gathering" means the ICE engine is currently gathering candidates,
// and "complete" means gathering is complete. Note that the engine can
// alternate between "gathering" and "complete" repeatedly as needs and
// circumstances change.
//
// We don't need to do anything when this happens, but we //console.log it to the
// console so you can see what's going on when playing with the sample.

const handleICEGatheringStateChangeEvent = (event) => {
    console.log("*** ICE gathering state changed to: " + myPeerConnection.iceGatheringState);
}


// function handleHangUpMsg(msg) {
//     //console.log("*** Received hang up notification from other peer");

//     closeVideoCall();
// }

// Hang up the call by closing our end of the connection, then
// sending a "hang-up" message to the other peer (keep in mind that
// the signaling is done on a different connection). This notifies
// the other peer that the connection should be terminated and the UI
// returned to the "no call in progress" state.

async function hangUpCall() {
    closeVideoCall();

    await sockets.send(`${userId}-${partnerId}`, 'hang-up', {
        name: myID,
        target: targetID,
        type: "hang-up"
    });
}


// Accept an offer to video chat. We configure our local settings,
// create our RTCPeerConnection, get and attach our local camera
// stream, then create and send an answer to the caller.

const handleVideoOfferMsg = async (msg) => {

    // If we're not already connected, create an RTCPeerConnection
    // to be linked to the caller.

    //console.log("Received video chat offer from " + targetID);
    // if (!myPeerConnection) {
    //     create(userId || "user2", partnerId || "user1");
    // }

    // We need to set the remote description to the received SDP offer
    // so that our local WebRTC layer knows how to talk to the caller.

    const desc = new RTCSessionDescription(msg.body);

    // If the connection isn't stable yet, wait for it...

    if (myPeerConnection.signalingState != "stable") {
        //console.log("  - But the signaling state isn't stable, so triggering rollback");

        // Set the local and remove descriptions for rollback; don't proceed
        // until both return.
        await Promise.all([
            myPeerConnection.setLocalDescription({ type: "rollback" }),
            myPeerConnection.setRemoteDescription(desc)
        ]);
        return;
    } else {
        // //console.log("  - Setting remote description");
        await myPeerConnection.setRemoteDescription(desc);
    }

    // Get the webcam stream if we don't already have it
    let webcamStream = null;
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        events.emit('local.stream.received', webcamStream)
    } catch (err) {
        handleGetUserMediaError(err);
        return;
    }

    // Add the camera stream to the RTCPeerConnection

    if (myPeerConnection) {
        try {
            webcamStream.getTracks().forEach(track => myPeerConnection.addTrack(track, webcamStream));
        } catch (err) {
            handleGetUserMediaError(err);
        }
    }

    // //console.log("---> Creating and sending answer to caller");

    await myPeerConnection.setLocalDescription(await myPeerConnection.createAnswer());
    console.log("video-answer userID ", userId, myPeerConnection.localDescription)
    console.log("video-answer partnerID ", partnerId)
    sockets.send(`${userId}-${partnerId}`, "video-answer", {
        name: userId, // my key in AWS
        target: partnerId, // my partner's key in AWS
        type: "video-answer", // to be added to my partners key in AWS
        body: myPeerConnection.localDescription
    })
    // sendToS3({
    //     name: userId, // my key in AWS
    //     target: partnerId, // my partner's key in AWS
    //     type: "video-answer", // to be added to my partners key in AWS
    //     body: myPeerConnection.localDescription
    // });
    // checkForStuff(`${userId}/currentPartner/new-ice-candidate`)


}

// Responds to the "video-answer" message sent to the caller
// once the callee has decided to accept our request to talk.

const handleVideoAnswerMsg = async (msg) => {
    //console.log("*** Call recipient has accepted our call");
    const webrtc = msg.body;

    //console.log("got video answer from partner ", msg.body)

    // Configure the remote description, which is the SDP payload
    // in our "video-answer" message.

    const desc = new RTCSessionDescription(webrtc);
    try {
        await myPeerConnection.setRemoteDescription(desc);
    } catch (error) {
        reportError(error)
    }

    setTimeout(() => {
        // checkForStuff(`${userId}/currentPartner/new-ice-candidate`)
    }, 1000)
}

// A new ICE candidate has been received from the other peer. Call
// RTCPeerConnection.addIceCandidate() to send it along to the
// local ICE framework.

const handleNewICECandidateMsg = async (msg) => {
    //console.log("handleNewICECandidateMsg msg ", msg)
    const candidate = new RTCIceCandidate(msg.body);

    console.log("*** Adding received ICE candidate: " + JSON.stringify(candidate));
    try {

        const response = await myPeerConnection.addIceCandidate(candidate)
        console.log('wijnand2', response, myPeerConnection);
    } catch (err) {
        console.error(err)
        reportError(err);
    }
}

// Handle errors which occur when trying to access the local media
// hardware; that is, exceptions thrown by getUserMedia(). The two most
// likely scenarios are that the user has no camera and/or microphone
// or that they declined to share their equipment when prompted. If
// they simply opted not to share their media, that's not really an
// error, so we won't present a message in that situation.

const handleGetUserMediaError = (e) => {

    // console.error(e);
    switch (e.name) {
        case "NotFoundError":
            alert("Unable to open your call because no camera and/or microphone" +
                "were found.");
            break;
        case "SecurityError":
        case "PermissionDeniedError":
            // Do nothing; this is the same as the user canceling the call.
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }

    // Make sure we shut down our end of the RTCPeerConnection so we're
    // ready to try again.

    closeVideoCall();
}

export async function checkForStuff(data) {
    async function subscribe() {
        let response = await fetch(`/api/signaling?key=${data}`);

        if (response.status == 502) {
            //console.log(" got a 502 status")
            await subscribe();
        } else if (response.status != 200) {
            // An error - let's show it
            //console.log(response.statusText);
            // Reconnect in one second
            await new Promise(resolve => setTimeout(resolve, 1000));
            await subscribe();
        } else {
            // Get and show the message
            let message = await response.json();
            //console.log(message);
            if (message.type === 'video-offer') {
                console.log("checkedforstuff video offer ", message)
                handleVideoOfferMsg(message);
            }
            if (message.type === 'video-answer') {
                console.log("checkedforstuff video answer ", message)
                handleVideoAnswerMsg(message);
            }
            if (message.type === 'new-ice-candidate') {
                let msg = message.body
                console.log("checkedforstuff new ice message ", userId, msg)
                if (msg.candidate !== '') {
                    handleNewICECandidateMsg(msg);
                } else {
                    await subscribe();
                }
            }
            // Call subscribe() again to get the next message
        }
    }

    subscribe();
}
