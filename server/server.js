const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client/build')));

app.post('/api/connect', async (req, res) => {
    const { clientId, clientSecret, authBaseUri } = req.body;
    console.log('Connecting to Marketing Cloud with:', { clientId, authBaseUri });
    try {
        const response = await axios.post(`${authBaseUri}/v2/token`, {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        });
        console.log('Connected:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error connecting to Marketing Cloud:', error.response ? error.response.data : error.message);
        res.status(500).send(error.response ? error.response.data : error.message);
    }
});

app.post('/api/dataextensions', async (req, res) => {
    const { accessToken, restBaseUri, dataExtensions } = req.body;
    console.log('Creating Data Extensions with:', { accessToken, restBaseUri, dataExtensions });
    try {
        for (const de of dataExtensions) {
            console.log('Creating Data Extension:', de);
            const response = await axios.post(`${restBaseUri}/data/v1/customobjects`, de, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            console.log('Data Extension creation response:', response.data);
        }
        console.log('Data Extensions created successfully');
        res.status(200).send('Data Extensions created successfully');
    } catch (error) {
        console.error('Error creating Data Extensions:', error.response ? error.response.data : error.message);
        res.status(500).send(error.response ? error.response.data : error.message);
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
