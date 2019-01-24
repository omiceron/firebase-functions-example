const functions = require('firebase-functions')
const admin = require('firebase-admin')
const {
  getChatReference,
  getUserChatsReference,
  makeChatDataCaller,
} = require('./utils')

admin.initializeApp()

exports.sendMessage = functions.https.onCall(async (data, context) => {
  const {text, chatId} = data
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
    text,
    user,
    timestamp: admin.database.ServerValue.TIMESTAMP,
  }

  chatReference
    .push(message)
    .then(res => console.log('SEND MESSAGE:', 'message pushed to chat'))
    .catch(err => {
      throw new functions
        .https
        .HttpsError('resource-exhausted', 'Pushing message in chat error')
    })

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

  return text
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

  const key = await getUserChatsReference(currentUserId)
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
  return chatId

})
