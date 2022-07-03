import Header from './../components/header';
import styles from '../styles/Home.module.css';
import Particles from 'react-particles-js';
import Link from 'next/link'
import React, { useEffect, useState, useRef } from 'react';

export default function Home() {

  const userVideo = useRef();
  const partnerVideo = useRef();

  const mediaConstraints = {
    audio: true,            // We want an audio track
    video: {
      aspectRatio: {
        ideal: 1.333333     // 3:2 aspect is preferred
      }
    }
  };

  // var myHostname = window.location.hostname;
  var myHostname = "localhost";
  // if (!myHostname) {
  // myHostname = "localhost";
  // }

  const createUser = async () =>{
    await fetch('/api/signaling',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
    })
    .then(response => response.json())
    .then(data => console.log(data));  
  } 

  const getUser = async () =>{
    await fetch('/api/signaling',{
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(response => {
      return response.json(); 
    }).then(data =>{
      console.log("this is the dataa ", data)
    });  
  } 



  //******** Actual Matching and WebRTC stuff *******

  var connection = null;
  var myId;
  var partnerId;
  var myUsername = null;
  //webrtc vars
  var myID = null;
  var targetID = null;      // To store username of other peer
  var myPeerConnection = null;    // RTCPeerConnection
  var transceiver = null;         // RTCRtpTransceiver
  var webcamStream = null;
  var alreadyGreeting = false;

  function connect() {

    connection = new WebSocket(serverUrl, "json"); // this needs to be changed into the long polling function

    connection.onerror = function(evt) {
      console.dir(evt);
    }
    connection.onopen = function(evt) {
      //send username asap, once connection as been made
      sendToServer({
        text: usernameInput,
        type: "username"
      });
    };
    connection.onmessage = function(evt) {
      var msg = JSON.parse(evt.data);
      console.log("Message received: ");
      console.dir(msg);

      switch(msg.type) {
        case "id":
          myId = msg.id
          userIdel.innerText = myId;
          console.log('id');
          break;
        case "matched":
          if(msg.user1.id === myId){
            partnerId = msg.user2.id
            username.innerText = msg.user1.username;
            partnerName.innerText = msg.user2.username;
            prevUsersArrayel.innerText = msg.user1.prevMatched;
            console.log('called from match user1')
            invite(msg);
          }else{
            partnerId = msg.user1.id
            username.innerText = msg.user2.username;
            partnerName.innerText = msg.user1.username;
            prevUsersArrayel.innerText = msg.user2.prevMatched;
          }
          findingPartnerel.style.display = "none"
          newPartnerel.style.display = "block"
          // will have to put set time out somewhere else if user1 going to invite
          // setTimeout(()=>{
          //   findNewPartner(myId)
          // },6000)
          //user1 will always disconnect
          break;
        case "matching":
          closeVideoCall();
          partnerId = null;
          alreadyGreeting = false;
          findingPartnerel.style.display = "block"
          newPartnerel.style.display = "none"
          break;
        case "banned":
          window.location.href = "/banned.html";
          connection.close();
          break;
        case "video-offer":  // Invitation and offer to chat
          console.log('video offer message recieved')
          handleVideoOfferMsg(msg);
          break;
        case "video-answer":  // Callee has answered our offer
          handleVideoAnswerMsg(msg);
          break;
        case "new-ice-candidate": // A new ICE candidate has been received
          console.log("NEW ICE CANDIDATE ", iceCounter++)
          startGreetingSession();
          handleNewICECandidateMsg(msg);
          break;
        case "hang-up": // The other peer has hung up the call
          closeVideoCall();
          break;

        // Unknown message; output to console for debugging.
        default:
          console.log("Unknown message received:");
          console.log('unknown message on refresh');
          console.dir(msg, { depth: null });
          //console.error(msg);
        }
      };
  }

    // Create the RTCPeerConnection which knows how to talk to our
    // selected STUN/TURN server and then uses getUserMedia() to find
    // our camera and microphone and add that stream to the connection for
    // use in our video call. Then we configure event handlers to get
    // needed notifications on the call.
    var myPeerConnection = null;
    const createPeerConnection = async () => {
      console.log("Setting up a connection...");

      // Create an RTCPeerConnection which knows to use our chosen
      // STUN server.

      myPeerConnection = new RTCPeerConnection({
        iceServers: [     // Information about ICE servers - Use your own!
          {
            urls: "turn:" + myHostname,  // A TURN server
            username: "webrtc",
            credential: "turnserver"
          }
        ]
      });

      console.log("this is my peer connection ", myPeerConnection)

      // Set up event handlers for the ICE negotiation process.

      myPeerConnection.onicecandidate = handleICECandidateEvent;
      myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
      myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
      myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
      myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
      myPeerConnection.ontrack = handleTrackEvent;
    }

    // Called by the WebRTC layer to let us know when it's time to
    // begin, resume, or restart ICE negotiation.

    const handleNegotiationNeededEvent = async () => {
      console.log("*** Negotiation needed");

      try {
        console.log("---> Creating offer");
        const offer = await myPeerConnection.createOffer();

        // If the connection hasn't yet achieved the "stable" state,
        // return to the caller. Another negotiationneeded event
        // will be fired when the state stabilizes.

        if (myPeerConnection.signalingState != "stable") {
          console.log("     -- The connection isn't stable yet; postponing...")
          return;
        }

        // Establish the offer as the local peer's current
        // description.

        console.log("---> Setting local description to the offer");
        await myPeerConnection.setLocalDescription(offer);

        // Send the offer to the remote peer.

        console.log("---> Sending the offer to the remote peer");
        sendToServer({
          name: myID, // myID needs to be my s3 bucket key > will be added to 
          target: targetID, // targetID needs to be my partners s3 bucket key
          type: "video-offer", // type will be added to the key 
          sdp: myPeerConnection.localDescription // body
        });
      } catch(err) {
        console.log("*** The following error occurred while handling the negotiationneeded event:");
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
      console.log("*** Track event");
      partnerVideo.current.srcObject = event.streams[0];
    }

    // Handles |icecandidate| events by forwarding the specified
    // ICE candidate (created by our local ICE agent) to the other
    // peer through the signaling server.

    const handleICECandidateEvent = (event) => {
      if (event.candidate) {
        console.log("*** Outgoing ICE candidate: " + event.candidate.candidate);

        sendToServer({
          name: myID, // myID needs to be my s3 bucket key > will be added to 
          target: targetID, // my partner's id in AWS
          type: "new-ice-candidate", // to be added to the key 
          candidate: event.candidate
        });
      }
    }

    // Handle |iceconnectionstatechange| events. This will detect when the ICE connection is closed, failed, or disconnected.
    // This is called when the state of the ICE agent changes.

    const handleICEConnectionStateChangeEvent = (event) => {
      console.log("*** ICE connection state changed to " + myPeerConnection.iceConnectionState);

      switch(myPeerConnection.iceConnectionState) {
        case "closed":
        case "failed":
        case "disconnected":
        console.log('VIDEO CALL CLOOOOOSED')
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
      switch(myPeerConnection.signalingState) {
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
    // We don't need to do anything when this happens, but we console.log it to the
    // console so you can see what's going on when playing with the sample.

    const handleICEGatheringStateChangeEvent = (event) => {
      console.log("*** ICE gathering state changed to: " + myPeerConnection.iceGatheringState);
    }


    // Close the RTCPeerConnection and reset variables so that the user can
    // make or receive another call if they wish. This is called both
    // when the user hangs up, the other user hangs up, or if a connection
    // failure is detected.

    const closeVideoCall = () => {
      console.log('video call closed')
      // var remoteVideo = document.getElementById("received_video");
      // var localVideo = document.getElementById("local_video");

      // if (myPeerConnection) {
      //   myPeerConnection.ontrack = null;
      //   myPeerConnection.onremovetrack = null;
      //   myPeerConnection.onremovestream = null;
      //   myPeerConnection.onicecandidate = null;
      //   myPeerConnection.oniceconnectionstatechange = null;
      //   myPeerConnection.onsignalingstatechange = null;
      //   myPeerConnection.onicegatheringstatechange = null;
      //   myPeerConnection.onnegotiationneeded = null;

      //   if (remoteVideo.current.srcObject) {
      //     remoteVideo.current.srcObject.getTracks().forEach(track => track.stop());
      //   }

      //   if (localVideo.current.srcObject) {
      //     localVideo.current.srcObject.getTracks().forEach(track => track.stop());
      //   }

      //   myPeerConnection.close();
      //   myPeerConnection = null;
      // }

      // remoteVideo.removeAttribute("src");
      // remoteVideo.removeAttribute("srcObject");
      // localVideo.removeAttribute("src");
      // remoteVideo.removeAttribute("srcObject");

      // targetID = null;
    }

    function handleHangUpMsg(msg) {
      console.log("*** Received hang up notification from other peer");

      closeVideoCall();
    }

    // Hang up the call by closing our end of the connection, then
    // sending a "hang-up" message to the other peer (keep in mind that
    // the signaling is done on a different connection). This notifies
    // the other peer that the connection should be terminated and the UI
    // returned to the "no call in progress" state.

    function hangUpCall() {
      closeVideoCall();

      sendToServer({
        name: myID,
        target: targetID,
        type: "hang-up"
      });
    }

    // Handle a click on an item in the user list by inviting the clicked
    // user to video chat. Note that we don't actually send a message to
    // the callee here -- calling RTCPeerConnection.addTrack() issues
    // a |notificationneeded| event, so we'll let our handler for that
    // make the offer.


    const invite = async (msg) => {
      console.log('Matching ', msg.caller, msg.responder);
      console.log("Starting to prepare an invitation ", myPeerConnection, !myPeerConnection);
      if (myPeerConnection) {
        alert("You can't start a call because you already have one open!");
      } else {
        // var partner = msg.target;
        // Record the username being called for future reference

        var targetID = msg.responder;
        var myID = msg.caller;
        var webcamStream = null;

        // Call createPeerConnection() to create the RTCPeerConnection.
        // When this returns, myPeerConnection is our RTCPeerConnection
        // and webcamStream is a stream coming from the camera. They are
        // not linked together in any way yet.

        createPeerConnection();

        // Get access to the webcam stream and attach it to the
        // "preview" box (id "local_video").

        try {
          webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
          userVideo.current.srcObject = webcamStream;
        } catch(err) {
          handleGetUserMediaError(err);
          return;
        }

        // Add the tracks from the stream to the RTCPeerConnection

        try {
          webcamStream.getTracks().forEach(track => myPeerConnection.addTrack(track, webcamStream));
        } catch(err) {
          handleGetUserMediaError(err);
        }
      }
    }

    // Accept an offer to video chat. We configure our local settings,
    // create our RTCPeerConnection, get and attach our local camera
    // stream, then create and send an answer to the caller.

    const handleVideoOfferMsg = async (msg) => {
      targetID = msg.name;

      // If we're not already connected, create an RTCPeerConnection
      // to be linked to the caller.

      console.log("Received video chat offer from " + targetID);
      if (!myPeerConnection) {
        createPeerConnection();
      }

      // We need to set the remote description to the received SDP offer
      // so that our local WebRTC layer knows how to talk to the caller.

      var desc = new RTCSessionDescription(msg.sdp);

      // If the connection isn't stable yet, wait for it...

      if (myPeerConnection.signalingState != "stable") {
        console.log("  - But the signaling state isn't stable, so triggering rollback");

        // Set the local and remove descriptions for rollback; don't proceed
        // until both return.
        await Promise.all([
          myPeerConnection.setLocalDescription({type: "rollback"}),
          myPeerConnection.setRemoteDescription(desc)
        ]);
        return;
      } else {
        console.log ("  - Setting remote description");
        await myPeerConnection.setRemoteDescription(desc);
      }

      // Get the webcam stream if we don't already have it
      webcamStream = null;
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      } catch(err) {
        handleGetUserMediaError(err);
        return;
      }

      userVideo.current.srcObject = webcamStream;

      // Add the camera stream to the RTCPeerConnection

      try {
        webcamStream.getTracks().forEach(track => myPeerConnection.addTrack(track, webcamStream));
      } catch(err) {
        handleGetUserMediaError(err);
      }

      console.log("---> Creating and sending answer to caller");

      await myPeerConnection.setLocalDescription(await myPeerConnection.createAnswer());

      sendToServer({
        name: myID, // my key in AWS
        target: targetID, // my partner's key in AWS
        type: "video-answer", // to be added to my partners key in AWS
        sdp: myPeerConnection.localDescription
      });
    }

    // Responds to the "video-answer" message sent to the caller
    // once the callee has decided to accept our request to talk.

    const handleVideoAnswerMsg = async (msg) => {
      console.log("*** Call recipient has accepted our call");

      // Configure the remote description, which is the SDP payload
      // in our "video-answer" message.

      var desc = new RTCSessionDescription(msg.sdp);
      await myPeerConnection.setRemoteDescription(desc).catch(reportError);
    }

    // A new ICE candidate has been received from the other peer. Call
    // RTCPeerConnection.addIceCandidate() to send it along to the
    // local ICE framework.

    const handleNewICECandidateMsg = async (msg) => {
      var candidate = new RTCIceCandidate(msg.candidate);

      console.log("*** Adding received ICE candidate: " + JSON.stringify(candidate));
      try {
        await myPeerConnection.addIceCandidate(candidate)
      } catch(err) {
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
      switch(e.name) {
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

    // Handles reporting errors. Currently, we just dump stuff to console but
    // in a real-world application, an appropriate (and user-friendly)
    // error message should be displayed.

    const reportError = (errMessage) => {
      console.error(`Error ${errMessage.name}: ${errMessage.message}`);
    }

    function sendToServer(msg) {
      var msgJSON = JSON.stringify(msg);

      console.log("Sending '" + msg.type + "' message: " + msgJSON);
      if(connection){
        connection.send(msgJSON);
      }
    }

  

  return (
    <>
        <div className={styles.container}>
            <Particles
            params={{
              "particles": {
                "number": {
                  "value": 70,
                  "density": {
                    "enable": true,
                    "value_area": 800
                  }
                },
                "color": {
                  "value": "#ffffff",
                  "opacity": 1 
                },
                "move": {
                  "random": true,
                  "speed": 1,
                  "direction": "random",
              },
              "size": {
                "value": 3,
                "random": true,
                "anim": {
                    "speed": 3,
                    "size_min": 0.3
                }
              },
            },
          }
          }
          />
          <div className={styles.page}>
            <Header />
            <div className={styles.main}>
              <Link href="/connect">
                <a>Start ZenGreeting</a>
              </Link>
              <a onClick={createUser}>Create a user</a>
              <a onClick={getUser}>Get a user</a>
              <a onClick={()=>{invite({
                caller:"123",
                responder:"456",
            })}}>Invite a user</a>

              <div className={styles.homeText}>
              <video playsInline muted ref={userVideo} autoPlay className={""} />

              </div>
            </div>

          </div>

        </div>
    </>
  )
}
