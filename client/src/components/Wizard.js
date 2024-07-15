import React, { useState } from 'react';
import axios from 'axios';
import { read, utils } from 'xlsx';
import Papa from 'papaparse';

const Wizard = () => {
    const [step, setStep] = useState(0);
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [authBaseUri, setAuthBaseUri] = useState('');
    const [restBaseUri, setRestBaseUri] = useState('');
    const [file, setFile] = useState(null);
    const [accessToken, setAccessToken] = useState('');
    const [error, setError] = useState('');
    const batchSize = 200; // Default batch size

    const steps = ['Configure Connection', 'Upload CSV'];

    const handleNext = async () => {
        setError('');
        if (step === 0) {
            try {
                const response = await axios.post('/api/connect', {
                    clientId,
                    clientSecret,
                    authBaseUri
                });
                setAccessToken(response.data.access_token);
                setStep(step + 1);
            } catch (error) {
                setError('Error connecting to Marketing Cloud: ' + (error.response ? error.response.data : error.message));
            }
        } else {
            try {
                const dataExtensions = await parseCsv(file);
                await createDataExtensionsInBatch(dataExtensions);
                alert('Data Extensions created successfully');
            } catch (error) {
                setError('Error creating Data Extensions: ' + (error.response ? error.response.data : error.message));
            }
        }
    };

    const handleBack = () => {
        setStep(step - 1);
    };

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
    };

    const downloadTemplate = () => {
        const headers = [
            'name', 'key', 'categoryId', 'sendableCustomObjectField', 'sendableSubscriberField',
            'fields__name', 'fields__type', 'fields__length', 'fields__ordinal', 'fields__isPrimaryKey',
            'fields__isNullable', 'fields__isTemplateField', 'fields__isInheritable', 'fields__isOverridable',
            'fields__isHidden', 'fields__isReadOnly', 'fields__mustOverride'
        ];
        const csvData = Papa.unparse([headers]);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data_extension_template.csv';
        a.click();
        URL.revokeObjectURL(url);
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
                let currentDataExtension = null;

                const toBoolean = (value) => value === 'true' || value === true;

                csvData.slice(1).forEach(row => {
                    if (!currentDataExtension || row[0] !== currentDataExtension.name || row[1] !== currentDataExtension.key) {
                        currentDataExtension = {
                            name: row[0],
                            key: row[1],
                            isSendable: true,
                            categoryId: row[2],
                            sendableCustomObjectField: row[3],
                            sendableSubscriberField: row[4],
                            fields: []
                        };
                        dataExtensions.push(currentDataExtension);
                    }

                    for (let i = 5; i < headers.length; i += 12) {
                        if (row[i] !== undefined && row[i + 1] !== undefined) {
                            const field = {
                                name: row[i],
                                type: row[i + 1],
                                length: parseInt(row[i + 2], 10),
                                ordinal: parseInt(row[i + 3], 10),
                                isPrimaryKey: toBoolean(row[i + 4]),
                                isNullable: toBoolean(row[i + 5]),
                                isTemplateField: toBoolean(row[i + 6]),
                                isInheritable: toBoolean(row[i + 7]),
                                isOverridable: toBoolean(row[i + 8]),
                                isHidden: toBoolean(row[i + 9]),
                                isReadOnly: toBoolean(row[i + 10]),
                                mustOverride: toBoolean(row[i + 11])
                            };
                            currentDataExtension.fields.push(field);
                        }
                    }
                });

                resolve(dataExtensions);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    };

    const createDataExtensionsInBatch = async (dataExtensions) => {
        for (let i = 0; i < dataExtensions.length; i += batchSize) {
            const batch = dataExtensions.slice(i, i + batchSize);
            try {
                await axios.post('/api/dataextensions', {
                    accessToken,
                    restBaseUri,
                    dataExtensions: batch
                });
            } catch (error) {
                console.error('Error creating batch:', error);
                setError('Error creating batch: ' + (error.response ? error.response.data : error.message));
                throw error; // Re-throw error to stop further processing
            }
        }
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
                        <div className="slds-button-group">
                            <button className="slds-button slds-button_brand" onClick={handleNext}>Next</button>
                            <button className="slds-button slds-button_neutral" onClick={downloadTemplate}>Download Template</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="slds-form-element slds-m-bottom_medium">
                            <label className="slds-form-element__label" htmlFor="csvFile">CSV File</label>
                            <div className="slds-form-element__control">
                                <input type="file" id="csvFile" className="slds-input" accept=".csv" onChange={handleFileUpload} />
                            </div>
                        </div>
                        <div className="slds-button-group">
                            <button className="slds-button slds-button_brand" onClick={handleNext}>Create Data Extensions</button>
                            <button className="slds-button slds-button_neutral" onClick={handleBack}>Back</button>
                        </div>
                    </div>
                )}
				<footer className="slds-m-top_large slds-text-align_center">
                    <p>Developed by Enrico Notaro</p>
                </footer>
            </div>
        </div>
    );
};

export default Wizard;
