import SparkMD5 from 'spark-md5'
import axios from 'axios'

const CHUNK_SIZE = 5 * 1024 * 1024

export async function getFileMD5(file) {
    return new Promise((resolve, reject) => {
        const blobSlice = File.prototype.slice
        const chunks = Math.ceil(file.size / CHUNK_SIZE)
        let currentChunk = 0
        const spark = new SparkMD5.ArrayBuffer()
        const fileReader = new FileReader()

        fileReader.onload = e => {
            spark.append(e.target.result)
            currentChunk++
            if (currentChunk < chunks) {
                loadNext()
            } else {
                resolve(spark.end())
            }
        }
        fileReader.onerror = reject
        function loadNext() {
            const start = currentChunk * CHUNK_SIZE
            const end = Math.min(start + CHUNK_SIZE, file.size)
            fileReader.readAsArrayBuffer(blobSlice.call(file, start, end))
        }
        loadNext()
    })
}

export async function uploadChunk(file, md5, index, totalChunks) {
    const chunk = file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
    const fd = new FormData()
    fd.append('chunk', chunk)
    fd.append('md5', md5)
    fd.append('index', index)
    fd.append('total', totalChunks)
    fd.append('filename', file.name)
    return axios.post('/api/files/upload-chunk', fd)
}