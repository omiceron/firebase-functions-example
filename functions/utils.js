const admin = require('firebase-admin')

exports.getUserChatsReference = (userId) => {
  return admin.database()
    .ref('people')
    .child(userId)
    .child('chats')
}

exports.getChatReference = (chatId) => admin.database()
  .ref('chats')
  .child(chatId)
  .child('messages')

exports.updateChat = (ref, message, chatId) =>
  ref.orderByChild('chatId')
    .equalTo(chatId)
    .once('value')
    .then(snapshot => {
      const key = Object.keys(snapshot.val())[0]

      return ref.child(key)
        .child('lastMessage')
        .update(message)
    })