from flask import Flask, request, jsonify
import pika
import json
from datetime import datetime
import time

app = Flask(__name__)

RABBITMQ_URL = "amqp://user:password@rabbitmq:5672"
QUEUE = "order_queue"

channel = None
connection = None


def connect_rabbitmq():
    global channel, connection
    while True:
        try:
            credentials = pika.PlainCredentials('user', 'password')
            connection = pika.BlockingConnection(
                pika.ConnectionParameters('rabbitmq', credentials=credentials)
            )
            channel = connection.channel()
            channel.queue_declare(queue=QUEUE, durable=True)
            
            print("Producer connected to RabbitMQ")
            break
        except Exception as e:
            print("Waiting for RabbitMQ...")
            time.sleep(3)


@app.route('/send', methods=['POST'])
def send_message():
    data = request.get_json()
    message = data.get('message')
    
    if not message:
        return jsonify({"error": "message is required"}), 400
    
    message_data = {
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    
    channel.basic_publish(
        exchange='',
        routing_key=QUEUE,
        body=json.dumps(message_data),
        properties=pika.BasicProperties(delivery_mode=2)  # persistent
    )
    
    print(f"Sent: {message_data}")
    
    return jsonify({"status": "sent", "dataSent": message_data}), 200


if __name__ == '__main__':
    connect_rabbitmq()
    app.run(host='0.0.0.0', port=3000, debug=False)
