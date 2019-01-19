const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

exports.sendMessage = functions.https.onCall((data, context) => {
  const text = data.text

  if (!text) return 'notext'

  admin.database().ref('/helloWorld').push({
    text: text
  })

  return text
})