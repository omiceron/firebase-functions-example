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

  const message = {
    text,
    user,
    timestamp: admin.database.ServerValue.TIMESTAMP,
  }

  const updateReference = ({key, message, ref}) =>
    ref.child(key)
      .child('lastMessage')
      .update(message)

  const getRecipientReference = ({chat: {userId}, chatId}) => {
    const ref = getUserChatsReference(userId)
    return makeChatDataCaller(ref, chatId)
  }

  const chatReference = getChatReference(chatId)
  chatReference.push(message).catch(err => {
    throw new functions
      .https
      .HttpsError('resource-exhausted', 'Pushing message in chat error')
  })

  const senderReference = getUserChatsReference(user)
  const senderChatDataCall = await makeChatDataCaller(senderReference, chatId)
  senderChatDataCall(updateReference, {message}).catch(err => {
    throw new functions
      .https
      .HttpsError('resource-exhausted', 'Updating sender chat error')
  })

  const recipientChatDataCall = await senderChatDataCall(getRecipientReference)
  recipientChatDataCall(updateReference, {message}).catch(err => {
    throw new functions
      .https
      .HttpsError('resource-exhausted', 'Updating recipient chat error')
  })

  return text
})


exports.createChatWith = functions.https.onCall(async (data, context) => {
  const {userId} = data
  const currentUserId = context.auth.uid

  console.log('Creating new chat...')

  const {key: chatId} = await admin.database()
    .ref('chats')
    .push({visibility: false})

  await getUserChatsReference(currentUserId)
    .push({userId, chatId, visibility: false})

  if (userId === currentUserId) {
    console.log('Self chat', chatId, 'was successfully created')
    return chatId
  }

  getUserChatsReference(userId)
    .push({userId: currentUserId, chatId, visibility: false})
    .then(res => console.log('Chat', chatId, 'was successfully created'))


  return chatId

})
