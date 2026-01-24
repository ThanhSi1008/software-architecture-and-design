rabbitmq = Message Broker
producer = Gui message
consumer = Xu ly message

Các service giao tiếp qua network Docker


+----------+        +------------+        +-----------+
| Producer | -----> | RabbitMQ   | -----> | Consumer  |
+----------+        +------------+        +-----------+
                         Queue

curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{"message":"Order #1000 send"}'

curl -X POST http://localhost:3000/send \
-H "Content-Type: application/json" \
-d '{"orderId":"Order #1000 send", "message":"Test"}'