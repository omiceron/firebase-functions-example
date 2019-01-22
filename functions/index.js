const functions = require('firebase-functions')
const admin = require('firebase-admin')
const {
  getChatReference,
  updateHelper,
  getUserChatsReference,
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

  const chatReference = getChatReference(chatId)
  const senderReference = getUserChatsReference(user)

  const updateReference = async ({key, message, ref}) =>
    ref.child(key)
      .child('lastMessage')
      .update(message)

  const getAndUpdateReference = async ({chat: {userId}, message}) =>
    updateHelper(getUserChatsReference(userId), message, chatId, updateReference)

  updateHelper(senderReference, message, chatId, updateReference)
  updateHelper(senderReference, message, chatId, getAndUpdateReference)

  chatReference.push(message)

  return text
})