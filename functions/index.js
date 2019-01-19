const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

exports.sendMessage = functions.https.onCall((data, context) => {
  const text = data.text
  const chatId = data.chatId
  const userId = context.auth.uid

  if (!text || !chatId) return 'notext'

  const ref = admin.database()
    .ref('chats')
    .child(chatId)
    .child('messages')

  const message = {
    text: text,
    user: userId,
    timestamp: admin.database.ServerValue.TIMESTAMP
  }

  ref.push(message)

  return text
})