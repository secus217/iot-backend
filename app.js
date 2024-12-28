const express = require('express');
const mqtt = require('mqtt');
const mongoose = require('mongoose');

// Kết nối đến MongoDB
mongoose.connect('mongodb://localhost:27017/sensorData', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Tạo mô hình dữ liệu cho cảm biến
const sensorSchema = new mongoose.Schema({
    temperature: Number,
    humidity: Number,
    timestamp: { type: Date, default: Date.now },
});

const SensorData = mongoose.model('SensorData', sensorSchema);

const app = express();
const port = 3000;

// Biến lưu dữ liệu cảm biến
let sensorData = { temperature: null, humidity: null };

// Kết nối tới MQTT broker
const mqttClient = mqtt.connect('mqtt://localhost:1883');

mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttClient.subscribe('sensor/data', (err) => {
        if (!err) {
            console.log('Subscribed to sensor/data topic');
        }
    });
});

mqttClient.on('message', (topic, message) => {
    if (topic === 'sensor/data') {
        try {
            sensorData = JSON.parse(message.toString());
            console.log('Received data:', sensorData);

            // Lưu dữ liệu vào MongoDB
            const newSensorData = new SensorData(sensorData);
            newSensorData.save((err) => {
                if (err) {
                    console.error('Error saving data to MongoDB:', err);
                } else {
                    console.log('Data saved to MongoDB:', sensorData);
                }
            });
        } catch (err) {
            console.error('Failed to parse MQTT message:', err);
        }
    }
});

// Hiển thị dữ liệu trên trang web
app.get('/api/sensor-data', async (req, res) => {
    try {
        const data = await SensorData.find().sort({ timestamp: -1 }); // Lấy tất cả bản ghi và sắp xếp theo timestamp giảm dần
        res.json(data);
    } catch (err) {
        console.error('Error fetching sensor data:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Web server running at http://localhost:${port}`);
});