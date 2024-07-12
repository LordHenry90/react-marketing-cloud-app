import React, { useState } from 'react';
import axios from 'axios';
import { read, utils } from 'xlsx';

const Wizard = () => {
    const [step, setStep] = useState(0);
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [authBaseUri, setAuthBaseUri] = useState('');
    const [restBaseUri, setRestBaseUri] = useState('');
    const [file, setFile] = useState(null);
    const [accessToken, setAccessToken] = useState('');
    const [error, setError] = useState('');

    const steps = ['Configure Connection', 'Upload CSV'];

    const handleNext = async () => {
        setError('');
        if (step === 0) {
            try {
                console.log('Sending connect request:', {
                    clientId,
                    clientSecret,
                    authBaseUri
                });
                const response = await axios.post('/api/connect', {
                    clientId,
                    clientSecret,
                    authBaseUri
                });
                console.log('Received access token:', response.data.access_token);
                setAccessToken(response.data.access_token);
                setStep(step + 1);
            } catch (error) {
                console.error('Error connecting to Marketing Cloud:', error);
                setError('Error connecting to Marketing Cloud: ' + (error.response ? error.response.data : error.message));
            }
        } else {
            try {
                const dataExtensions = await parseCsv(file);
                console.log('Sending data extensions request:', {
                    accessToken,
                    restBaseUri,
                    dataExtensions
                });
                await axios.post('/api/dataextensions', {
                    accessToken,
                    restBaseUri,
                    dataExtensions
                });
                alert('Data Extensions created successfully');
            } catch (error) {
                console.error('Error creating Data Extensions:', error);
                setError('Error creating Data Extensions: ' + (error.response ? error.response.data : error.message));
            }
        }
    };

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
    };

    const parseCsv = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const csvData = utils.sheet_to_json(sheet, { header: 1 });
                const headers = csvData[0];

                const dataExtensions = [];
                const fieldsIndex = headers.findIndex(header => header.startsWith('fields__'));

                csvData.slice(1).forEach(row => {
                    const fields = [];
                    for (let i = fieldsIndex; i < headers.length; i++) {
                        const fieldHeader = headers[i].split('__')[1];
                        fields.push({
                            [fieldHeader]: row[i]
                        });
                    }

                    dataExtensions.push({
                        name: row[0],
                        key: row[1],
                        isSendable: true,
                        categoryId: row[2],
                        sendableCustomObjectField: row[3],
                        sendableSubscriberField: row[4],
                        fields: fields
                    });
                });

                resolve(dataExtensions);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    };

    return (
        <div className="slds-grid slds-grid_align-center slds-p-around_medium">
            <div className="slds-box slds-theme_default slds-size_1-of-2">
                <h1 className="slds-text-heading_large slds-text-align_center slds-m-bottom_medium">
                    Marketing Cloud Data Extension Wizard
                </h1>
                <div className="slds-progress-bar slds-progress-bar_circular">
                    <span className="slds-progress-bar__value" style={{ width: `${(step / (steps.length - 1)) * 100}%` }}></span>
                </div>
                {error && <div className="slds-text-color_error">{error}</div>}
                {step === 0 ? (
                    <div>
                        <div className="slds-form-element slds-m-bottom_medium">
                            <label className="slds-form-element__label" htmlFor="clientId">Client Id</label>
                            <div className="slds-form-element__control">
                                <input type="text" id="clientId" className="slds-input" value={clientId} onChange={(e) => setClientId(e.target.value)} />
                            </div>
                        </div>
                        <div className="slds-form-element slds-m-bottom_medium">
                            <label className="slds-form-element__label" htmlFor="clientSecret">Client Secret</label>
                            <div className="slds-form-element__control">
                                <input type="password" id="clientSecret" className="slds-input" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
                            </div>
                        </div>
                        <div className="slds-form-element slds-m-bottom_medium">
                            <label className="slds-form-element__label" htmlFor="authBaseUri">Auth Base URI</label>
                            <div className="slds-form-element__control">
                                <input type="text" id="authBaseUri" className="slds-input" value={authBaseUri} onChange={(e) => setAuthBaseUri(e.target.value)} />
                            </div>
                        </div>
                        <div className="slds-form-element slds-m-bottom_medium">
                            <label className="slds-form-element__label" htmlFor="restBaseUri">REST Base URI</label>
                            <div className="slds-form-element__control">
                                <input type="text" id="restBaseUri" className="slds-input" value={restBaseUri} onChange={(e) => setRestBaseUri(e.target.value)} />
                            </div>
                        </div>
                        <button className="slds-button slds-button_brand" onClick={handleNext}>Next</button>
                    </div>
                ) : (
                    <div>
                        <div className="slds-form-element slds-m-bottom_medium">
                            <label className="slds-form-element__label" htmlFor="csvFile">CSV File</label>
                            <div className="slds-form-element__control">
                                <input type="file" id="csvFile" className="slds-input" accept=".csv" onChange={handleFileUpload} />
                            </div>
                        </div>
                        <button className="slds-button slds-button_brand" onClick={handleNext}>Create Data Extensions</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wizard;
