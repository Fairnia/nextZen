import Header from './../components/header';
import styles from '../styles/Home.module.css';
import React, { useState, useRef } from 'react';
import * as PeerConnection from '../lib/peer-connection';

export default function Home() {

  const [userId, setUserId] = useState("user1");
  const [partnerId, setpartnerId] = useState("user2");

  const otherVideo = useRef();
  const userVideo = useRef();

  const mediaConstraints = {
    audio: true,            // We want an audio track
    video: {
      aspectRatio: {
        ideal: 1.333333     // 3:2 aspect is preferred
      }
    }
  };

  const changeUser = () => {
    setUserId("user2");
    setpartnerId("user1");
  }

  const deleteAllUsers = async () => {
    await fetch('/api/signaling', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(response => {
      return response.json();
    }).then(data => {
      //console.log("this is the dataa ", data)
    });
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


  // Handle a click on an item in the user list by inviting the clicked
  // user to video chat. Note that we don't actually send a message to
  // the callee here -- calling RTCPeerConnection.addTrack() issues
  // a |notificationneeded| event, so we'll let our handler for that
  // make the offer.

  // user1 always invites user2
  const invite = async () => {
    //console.log("Starting to prepare an invitation ", myPeerConnection, !myPeerConnection);
    if (PeerConnection.get()) {
      alert("You can't start a call because you already have one open!");
      return;
    }

    // Call createPeerConnection() to create the RTCPeerConnection.
    // When this returns, myPeerConnection is our RTCPeerConnection
    // and webcamStream is a stream coming from the camera. They are
    // not linked together in any way yet.

    PeerConnection.create(userId, partnerId);

    PeerConnection.events.on('partner.stream.received', (stream) => {
      otherVideo.current.srcObject = stream;
    })

    // Get access to the webcam stream and attach it to the
    // "preview" box (id "local_video").
    let webcamStream;
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      userVideo.current.srcObject = webcamStream;
    } catch (err) {
      handleGetUserMediaError(err);
      return;
    }

    // Add the tracks from the stream to the RTCPeerConnection
    if (PeerConnection.get()) {
      try {
        webcamStream.getTracks().forEach(track => PeerConnection.get().addTrack(track, webcamStream));
      } catch (err) {
        handleGetUserMediaError(err);
      }
    } else {
      console.log('no peer connection')
    }
  }

  // Handles reporting errors. Currently, we just dump stuff to console but
  // in a real-world application, an appropriate (and user-friendly)
  // error message should be displayed.

  const reportError = (errMessage) => {
    console.error(`Error ${errMessage.name}: ${errMessage.message}`);
  }

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

  return (
    <>
      <div className={styles.container}>
        <div className={styles.page}>
          <Header />
          <div className={styles.main}>
            <a onClick={deleteAllUsers}>Delete Users</a>
            <a onClick={async () => {
              await PeerConnection.create(userId, partnerId);
              PeerConnection.events.on('local.stream.received', (stream) => {
                userVideo.current.srcObject = stream;
              })
              PeerConnection.events.on('partner.stream.received', (stream) => {
                otherVideo.current.srcObject = stream;
              })
              // await PeerConnection.checkForStuff(`${userId}/currentPartner`);
            }}>Check for video offer</a>

            <a onClick={async () => {
              await invite()
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
