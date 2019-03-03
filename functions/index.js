const functions = require('firebase-functions')
const admin = require('firebase-admin')

// const path = require('path')
// const os = require('os')
// const fs = require('fs')
// const request = require('request-promise')

// const {Storage} = require('@google-cloud/storage')
// const storage = new Storage()

const {
  getChatReference,
  getUserChatsReference,
  makeChatDataCaller,
} = require('./utils')

admin.initializeApp()

exports.sendMessage = functions.https.onCall(async (data, context) => {
  const {text, chatId, token} = data
  const user = context.auth.uid

  if (!text || !chatId) {
    throw new functions
      .https
      .HttpsError('invalid-argument', 'Message text or chatId error')
  }

  const updateReference = ({key, message, ref}) =>
    ref.child(key)
      .child('lastMessage')
      .update(message)

  const getRecipientReference = ({chat: {userId}, user, chatId}) => {
    if (user === userId) return null
    const ref = getUserChatsReference(userId)
    return makeChatDataCaller(ref, chatId)
  }

  const chatReference = getChatReference(chatId)

  const message = {
    token,
    text,
    user,
    timestamp: admin.database.ServerValue.TIMESTAMP,
  }

  const senderReference = getUserChatsReference(user)
  const senderChatDataCall = await makeChatDataCaller(senderReference, chatId)

  senderChatDataCall(updateReference, {message})
    .then(res => console.log('SEND MESSAGE:', 'sender chat updated'))
    .catch(err => {
      throw new functions
        .https
        .HttpsError('resource-exhausted', 'Updating sender chat error')
    })

  const recipientChatDataCall =
    await senderChatDataCall(getRecipientReference, {user})

  if (recipientChatDataCall) {
    recipientChatDataCall(updateReference, {message})
      .then(res => console.log('SEND MESSAGE:', 'recipient chat updated'))
      .catch(err => {
        throw new functions
          .https
          .HttpsError('resource-exhausted', 'Updating recipient chat error')
      })
  } else {
    console.log('SEND MESSAGE:', 'no recipient, self-chat')
  }

  const key = await chatReference
    .push(message)
    .then(res => {
      console.log('SEND MESSAGE:', 'message pushed to chat')
      return res.key
    })
    .catch(err => {
      throw new functions
        .https
        .HttpsError('resource-exhausted', 'Pushing message in chat error')
    })

  return {key}
})

exports.createChatWith = functions.https.onCall(async (data, context) => {
  const {userId} = data
  const currentUserId = context.auth.uid

  console.log('CREATE CHAT:', 'start')

  const {key: chatId} = await admin.database()
    .ref('chats')
    .push({visibility: false})
    .then(res => {
      console.log('CREATE CHAT:', 'chat pushed')
      return res
    })
    .catch(err => {
      throw new functions
        .https
        .HttpsError('resource-exhausted', 'Create chat error')
    })

  const {key} = await getUserChatsReference(currentUserId)
    .push({userId, chatId, visibility: false})
    .then(res => {
      console.log('CREATE CHAT:', 'sender chat updated')
      return res
    })
    .catch(err => {
      throw new functions
        .https
        .HttpsError('resource-exhausted', 'Create chat error')
    })

  if (userId !== currentUserId) {
    getUserChatsReference(userId)
      .push({userId: currentUserId, chatId, visibility: false})
      .then(res => console.log('CREATE CHAT:', 'recipient chat updated'))
      .catch(err => {
        throw new functions
          .https
          .HttpsError('resource-exhausted', 'Create chat error')
      })
  } else {
    console.log('CREATE CHAT:', 'no recipient, self-chat')
  }

  console.log('CREATE CHAT:', 'end')

  return {chatId, key}

})

exports.checkUser = functions.https.onCall(async ({uid, ...data}, context) => {

  console.log('CHECK USER:', 'start')


  const reference = admin.database().ref('people')

  // const isCreated = await reference
  //   .child(uid)
  //   .once('value')
  //   .then(snapshot => snapshot.exists())
  //
  // if (isCreated) {
  //   console.log('CHECK USER:', 'already created', uid)
  //   return
  // }

  console.log('CHECK USER:', 'end')

  reference.child(uid).update(data)

  // const tempFilePath = path.join(os.tmpdir(), 'temp')
  //
  // await request(avatar).pipe(fs.createWriteStream(tempFilePath)).catch(console.log)
  //
  // await storage.bucket().upload(tempFilePath).catch(console.log)

  // await reference
  //   .child(user.uid)
  //   .once('value', snapshot => {
  //     console.log(snapshot.exists())
  //
  //     if (!snapshot.exists()) {
  //       const {email, picture, name} = user
  //
  //       let firstName = null, lastName = null
  //
  //       if (name) {
  //         [firstName, lastName] = name.split(' ')
  //       } else {
  //         admin.auth().updateUser(user.uid, {displayName: name})
  //         // const {firstName: newUserFirstName} = this.getStore(AUTH_STORE)
  //         // if (newUserFirstName) {
  //         //   firstName = newUserFirstName
  //         // firebase.auth().currentUser.updateProfile({displayName: newUserFirstName})
  //         // }
  //       }
  //
  //       return reference.child(user.uid).update({
  //         firstName,
  //         lastName,
  //         email,
  //         avatar: picture,
  //       })
  //     } else {
  //       return null
  //     }
  //   })
})

exports.createUser = functions.https.onCall(
  async (data, context) => {
    console.log('CREATE USER:', 'start')

    const {displayName: firstName, email, uid} =
      await admin.auth().createUser(data)
        .catch(err => {
          throw new functions
            .https
            .HttpsError('internal', 'Auth createUser error')
        })

    console.log('CREATE USER:', 'user created')

    await admin.database()
      .ref('people')
      .child(uid)
      .update({firstName, email})
      .catch(err => {
        throw new functions
          .https
          .HttpsError('internal', 'Database update user error')
      })

    console.log('CREATE USER:', 'end')

  })