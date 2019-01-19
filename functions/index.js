const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

const getChatReference = require('./utils').getChatReference
const updateChat = require('./utils').updateChat
const getUserChatsReference = require('./utils').getUserChatsReference

exports.sendMessage = functions.https.onCall((data, context) => {
  const text = data.text
  const chatId = data.chatId
  const userId = context.auth.uid

  if (!text || !chatId) throw new Error('Message text or chatId error')

  const message = {
    text: text,
    user: userId,
    timestamp: admin.database.ServerValue.TIMESTAMP
  }

  const chatReference = getChatReference(chatId)
  const senderReference = getUserChatsReference(userId)

  updateChat(senderReference, message, chatId)

  senderReference
    .orderByChild('chatId')
    .equalTo(chatId)
    .once('value')
    .then(snapshot => {
      const data = snapshot.val()
      const key = Object.keys(data)[0]
      const chat = data[key]
      const recipientReference = getUserChatsReference(chat.userId)

      return updateChat(recipientReference, message, chatId)
    })

  chatReference.push(message)

  return text
})