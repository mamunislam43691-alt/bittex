const mongoose = require('mongoose')

const NewsPostSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  content:   { type: String },
  category:  { type: String, enum: ['news','update','tips'], default: 'news' },
  imageUrl:  { type: String },
  imageFile: { type: String },
  videoUrl:  { type: String },
  videoFile: { type: String },
  published: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('NewsPost', NewsPostSchema)
