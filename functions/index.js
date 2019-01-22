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

  if (!text || !chatId) throw new Error('Message text or chatId error')

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
    throw new Error('Pushing message in chat error')
  })

  const senderReference = getUserChatsReference(user)
  const senderChatDataCall = await makeChatDataCaller(senderReference, chatId)
  senderChatDataCall(updateReference, {message}).catch(err => {
    throw new Error('Updating sender chat error')
  })

  const recipientChatDataCall = await senderChatDataCall(getRecipientReference)
  recipientChatDataCall(updateReference, {message}).catch(err => {
    throw new Error('Updating recipient chat error')
  })

  return text
})