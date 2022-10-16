import Header from './../components/header';
import styles from '../styles/Home.module.css';
import Particles from 'react-particles-js';
import Link from 'next/link'
import React, { useEffect, useState, useRef } from 'react';

export default function Home() {

  const [userId, setUserId] = useState("user1");
  const [partnerId, setpartnerId] = useState("user2");


  var otherVideo = useRef();
  var userVideo = useRef();

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

  const changeUser = () => {
    setUserId("user2");
    setpartnerId("user1");
  }


  const createUser = async () => {
    await fetch('/api/signaling', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
    })
      .then(response => response.json())
    // .then(data => console.log(data));
  }

  const sendToS3 = async (data) => {
    await fetch('/api/signaling', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      },
    })
      .then(response => response.json())
    // .then(data => console.log(
    //   "this is from sendtos3: ", data));
  }

  const getFromS3 = async () => {
    await fetch('/api/signaling', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(response => {
      return response.json();
    }).then(data => {
      //console.log("this is the data from signaling", data)
    });
  }

  const putUsers = async () => {
    await fetch('/api/users', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(response => {
      //console.log("response ", response)
      return response.text;
    }).then(data => {
      //console.log("this is the data from users ", data)
    });
  }

  const getUsers = async () => {
    await fetch('/api/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(response => {
      return response.json();
    }).then(data => {
      //console.log("this is the dataa ", data)
    });
  }

  const getUserData = async () => {
    await fetch(`/api/signaling/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(response => {
      return response.json();
    }).then(data => {
      //console.log("this is the data ", data)
    });
  }

  const checkForStuff = async (data) => {
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
          console.log("checkedforstuff new ice message ", typeof msg, msg)
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



  //******** Actual Matching and WebRTC stuff *******

  var connection = null;
  var myUsername = null;
  //webrtc vars
  var myID = null;
  var targetID = null;      // To store username of other peer
  var myPeerConnection = null;    // RTCPeerConnection
  var transceiver = null;         // RTCRtpTransceiver
  var webcamStream = null;
  var alreadyGreeting = false;



  // Create the RTCPeerConnection which knows how to talk to our
  // selected STUN/TURN server and then uses getUserMedia() to find
  // our camera and microphone and add that stream to the connection for
  // use in our video call. Then we configure event handlers to get
  // needed notifications on the call.
  var myPeerConnection = null;
  const createPeerConnection = async () => {
    //console.log("Setting up a connection...");

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
    //console.log("*** Negotiation needed");

    try {
      //console.log("---> Creating offer");
      const offer = await myPeerConnection.createOffer();

      // If the connection hasn't yet achieved the "stable" state,
      // return to the caller. Another negotiationneeded event
      // will be fired when the state stabilizes.

      if (myPeerConnection.signalingState != "stable") {
        //console.log("     -- The connection isn't stable yet; postponing...")
        return;
      }

      // Establish the offer as the local peer's current
      // description.

      // //console.log("---> Setting local description to the offer"); 
      await myPeerConnection.setLocalDescription(offer);

      // Send the offer to the remote peer. video-offer

      //console.log("---> Sending the video-offer to the remote peer ", myPeerConnection.localDescription);
      console.log("video-offer userID ", userId, myPeerConnection.localDescription)
      console.log("video-offer partnerID ", partnerId)
      if (userId == 'user1') {

        sendToS3({
          name: userId, // myID needs to be my s3 bucket key > will be added to 
          target: partnerId, // targetID needs to be my partners s3 bucket key
          type: "video-offer", // type will be added to the key 
          body: myPeerConnection.localDescription // body
        });
        checkForStuff(`${userId}/currentPartner`)
      } else {
        // checkForStuff(`${userId}/currentPartner`)

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
    //console.log("*** Track event ", event.streams[0]);
    otherVideo.current.srcObject = event.streams[0];

  }

  // ​
  // active: true
  // ​
  // id: "{c922a163-a05b-4d89-83a8-7998563d9ce3}"
  // ​
  // onaddtrack: null
  // ​
  // onremovetrack: null

  // Handles |icecandidate| events by forwarding the specified
  // ICE candidate (created by our local ICE agent) to the other
  // peer through the signaling server.

  const handleICECandidateEvent = (event) => {
    if (event.candidate) {
      console.log("new-ice-candidate userID ", userId)
      console.log("new-ice-candidate partnerID ", partnerId)
      // console.log("*** Outgoing ICE candidate: " + event.candidate.candidate);
      // ff here
      sendToS3({
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
    //console.log("*** ICE connection state changed to " + myPeerConnection.iceConnectionState);

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
    //console.log("*** WebRTC signaling state changed to: " + myPeerConnection.signalingState);
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
    //console.log("*** ICE gathering state changed to: " + myPeerConnection.iceGatheringState);
  }


  // Close the RTCPeerConnection and reset variables so that the user can
  // make or receive another call if they wish. This is called both
  // when the user hangs up, the other user hangs up, or if a connection
  // failure is detected.

  const closeVideoCall = () => {
    //console.log('video call closed')
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
    //console.log("*** Received hang up notification from other peer");

    closeVideoCall();
  }

  // Hang up the call by closing our end of the connection, then
  // sending a "hang-up" message to the other peer (keep in mind that
  // the signaling is done on a different connection). This notifies
  // the other peer that the connection should be terminated and the UI
  // returned to the "no call in progress" state.

  function hangUpCall() {
    closeVideoCall();

    sendToS3({
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

  // user1 always invites user2
  const invite = async () => {
    //console.log("Starting to prepare an invitation ", myPeerConnection, !myPeerConnection);
    if (myPeerConnection) {
      alert("You can't start a call because you already have one open!");
    } else {
      // var partner = msg.target;
      // Record the username being called for future reference

      var targetID = partnerId; // user2
      var myID = userId; // user1
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

        //console.log('webcamstream ', webcamStream)
        userVideo.current.srcObject = webcamStream;

      } catch (err) {
        handleGetUserMediaError(err);
        return;
      }

      // Add the tracks from the stream to the RTCPeerConnection

      try {
        webcamStream.getTracks().forEach(track => myPeerConnection.addTrack(track, webcamStream));
      } catch (err) {
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

    //console.log("Received video chat offer from " + targetID);
    if (!myPeerConnection) {
      createPeerConnection();
    }

    // We need to set the remote description to the received SDP offer
    // so that our local WebRTC layer knows how to talk to the caller.

    var desc = new RTCSessionDescription(msg.body);

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
    webcamStream = null;
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    } catch (err) {
      handleGetUserMediaError(err);
      return;
    }


    // otherVideo.current.srcObject = webcamStream;
    userVideo.current.srcObject = webcamStream;

    // Add the camera stream to the RTCPeerConnection

    try {
      webcamStream.getTracks().forEach(track => myPeerConnection.addTrack(track, webcamStream));
    } catch (err) {
      handleGetUserMediaError(err);
    }

    // //console.log("---> Creating and sending answer to caller");

    await myPeerConnection.setLocalDescription(await myPeerConnection.createAnswer());
    console.log("video-answer userID ", userId, myPeerConnection.localDescription)
    console.log("video-answer partnerID ", partnerId)
    sendToS3({
      name: userId, // my key in AWS
      target: partnerId, // my partner's key in AWS
      type: "video-answer", // to be added to my partners key in AWS
      body: myPeerConnection.localDescription
    });
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

    var desc = new RTCSessionDescription(webrtc);
    await myPeerConnection.setRemoteDescription(desc).catch(reportError);
    checkForStuff(`${userId}/currentPartner/new-ice-candidate`)
  }

  // A new ICE candidate has been received from the other peer. Call
  // RTCPeerConnection.addIceCandidate() to send it along to the
  // local ICE framework.

  const handleNewICECandidateMsg = async (msg) => {

    //console.log("handleNewICECandidateMsg msg ", msg)
    var candidate = new RTCIceCandidate(msg);

    //console.log("*** Adding received ICE candidate: " + JSON.stringify(candidate));
    try {
      await myPeerConnection.addIceCandidate(candidate)
    } catch (err) {
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

  // Handles reporting errors. Currently, we just dump stuff to console but
  // in a real-world application, an appropriate (and user-friendly)
  // error message should be displayed.

  const reportError = (errMessage) => {
    console.error(`Error ${errMessage.name}: ${errMessage.message}`);
  }



  return (
    <>
      <div className={styles.container}>
        <div className={styles.page}>
          <Header />
          <div className={styles.main}>
            <Link href="/connect">
              <a>Start ZenGreeting</a>
            </Link>
            <a onClick={createUser}>Create a matched bucket</a>
            <a onClick={getFromS3}>Get a user from S3 signaling</a>
            <a onClick={putUsers}>PUT Users</a>
            <a onClick={getUsers}>Get Users</a>
            <a onClick={() => checkForStuff(`${userId}/currentPartner`)}>Check for video offer</a>

            <a onClick={() => {
              invite()
            }}>Invite function</a>

            <div className={styles.homeText}>

              <br></br>
              USER: {userId}<br></br>
              Partner: {partnerId}
              <br></br>

              <label>
                <input type="checkbox" onChange={changeUser} />
                Click to be user2
              </label>


              <video ref={userVideo} autoPlay className={"userVideo"} />

              <div className={styles.userVideo}>
                <video ref={otherVideo} autoPlay className={"otherVideo"} />
              </div>

            </div>

          </div>

        </div>

      </div>
    </>
  )
}
