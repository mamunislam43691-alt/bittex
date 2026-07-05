const mongoose = require('mongoose')

const AnnouncementSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  message:     { type: String, required: true },
  type:        { type: String, enum: ['info','warning','success','danger'], default: 'info' },
  displayType: { type: String, enum: ['popup','banner'], default: 'popup' },
  active:      { type: Boolean, default: true },
  imageUrl:    { type: String },
  videoUrl:    { type: String },
  buttonText:  { type: String },
  buttonUrl:   { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Announcement', AnnouncementSchema)
