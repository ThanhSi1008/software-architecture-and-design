import pika
import json
import time
import asyncio


RABBITMQ_URL = "amqp://user:password@rabbitmq:5672"
QUEUE = "order_queue"
DEAD_LETTER_QUEUE = "order_queue.dlq"


def connect_with_retry():
    while True:
        try:
            print("Consumer connecting...")
            credentials = pika.PlainCredentials('user', 'password')
            connection = pika.BlockingConnection(
                pika.ConnectionParameters('rabbitmq', credentials=credentials)
            )
            channel = connection.channel()
            
            # Declare DLQ first
            channel.queue_declare(queue=DEAD_LETTER_QUEUE, durable=True)
            
            # Declare main queue with DLQ
            channel.queue_declare(
                queue=QUEUE,
                durable=True,
                arguments={
                    'x-dead-letter-exchange': '',
                    'x-dead-letter-routing-key': DEAD_LETTER_QUEUE
                }
            )
            
            print("Waiting for messages...")
            
            def callback(ch, method, properties, body):
                try:
                    print(f"Processing: {body.decode()}")
                    data = json.loads(body.decode())
                    
                    if 'orderId' not in data:
                        raise Exception("Missing orderId")
                    
                    # Simulate processing
                    time.sleep(3)
                    
                    print("Process success")
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    
                except Exception as err:
                    print("Send to DLQ")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            
            channel.basic_consume(queue=QUEUE, on_message_callback=callback)
            channel.start_consuming()
            
        except Exception as err:
            print("Consumer failed, retry in 3s...")
            time.sleep(3)


if __name__ == '__main__':
    connect_with_retry()
