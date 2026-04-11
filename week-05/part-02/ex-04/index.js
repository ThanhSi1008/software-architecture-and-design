const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.send('<h1>Xin chao! Day la ung dung Node.js Express don gian chay qua Docker Compose.</h1>');
});

app.listen(PORT, () => {
    console.log(`Express app listening on port ${PORT}`);
});
