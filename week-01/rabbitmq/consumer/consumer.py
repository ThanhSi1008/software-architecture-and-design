import pika
import json
import time


RABBITMQ_URL = "amqp://user:password@rabbitmq:5672"
QUEUE = "order_queue"


def connect_with_retry():
    while True:
        try:
            print("Consumer connecting...")
            credentials = pika.PlainCredentials('user', 'password')
            connection = pika.BlockingConnection(
                pika.ConnectionParameters('rabbitmq', credentials=credentials)
            )
            channel = connection.channel()
            
            channel.queue_declare(queue=QUEUE, durable=True)
            print("Waiting for messages...")
            
            def callback(ch, method, properties, body):
                print(f"Processing: {body.decode()}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
            
            channel.basic_consume(queue=QUEUE, on_message_callback=callback)
            channel.start_consuming()
            
        except Exception as err:
            print("Consumer failed, retry in 3s...")
            time.sleep(3)


if __name__ == '__main__':
    connect_with_retry()
