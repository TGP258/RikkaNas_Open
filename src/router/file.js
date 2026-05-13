const express = require('express')
const router = express.Router()
const upload = require('../middleware/upload')
const { checkFileExist, uploadChunk, mergeChunks } = require('../service/fileService')

router.post('/check-exist', async (req, res) => {
    const exist = await checkFileExist(req.body.md5)
    res.json({ exist })
})

router.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
    const { md5, index } = req.body
    await uploadChunk(req.file, md5, index, req.file.originalname)
    res.json({ ok: 1 })
})

router.post('/merge', async (req, res) => {
    const { md5, total, filename } = req.body
    await mergeChunks(md5, total, filename, req.user.id)
    res.json({ ok: 1 })
})

module.exports = router