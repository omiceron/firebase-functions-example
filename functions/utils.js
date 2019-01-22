const admin = require('firebase-admin')

const getUserChatsReference = (userId) =>
  admin
    .database()
    .ref('people')
    .child(userId)
    .child('chats')

const getChatReference = (chatId) =>
  admin
    .database()
    .ref('chats')
    .child(chatId)
    .child('messages')

const updateHelper = async (ref, message, chatId, callback) =>
  ref
    .orderByChild('chatId')
    .equalTo(chatId)
    .once('value')
    .then(snapshot => {
      const data = snapshot.val()
      const [key, chat] = Object.entries(data)[0]

      return callback({key, chat, message, ref})
    })


exports.getUserChatsReference = getUserChatsReference
exports.getChatReference = getChatReference
exports.updateHelper = updateHelper