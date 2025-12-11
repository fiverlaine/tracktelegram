Os webhooks enviam uma requisição **POST** com informações sobre cada pedido. A Cakto interpreta qualquer resposta do seu sistema como entregue.

<aside>
💡

Há um limite de tempo de 10 segundos em que é aguardado a confirmação do recebimento da requisição por parte do seu sistema, caso não haja nenhum tipo de resposta é feito 4 tentativas adicionais.

</aside>

Exemplo de webhook em vendas de pagamento recorrente.
{
"secret": "8402b43f-c839-4090-bbd1-186725d185c7",
"event": "purchase_approved",
"data": {
"id": "1f1c81d2-088a-412d-8bb7-3d5269d64f58",
"refId": "6HngVo6",
"customer": {
"name": "Tulio sabino",
"birthDate": null,
"email": "tokipi8246@gamebcs.com",
"phone": "5534991462388",
"docNumber": "59089477098"
},
"affiliate": "",
"offer": {
"id": "jbwjmis",
"name": "Subscription [Stg]",
"price": 5
},
"offer_type": "main",
"product": {
"name": "Subscription [Stg]",
"id": "f947c21c-d8f0-41a1-a0a6-fede9f27b3b7",
"short_id": "6dRMZ6z",
"supportEmail": "teste@teste.com",
"type": "subscription",
"invoiceDescription": ""
},
"parent_order": "PEtfqq3",
"subscription": {
"id": "d464132a-fcfa-4693-a6aa-a99483f06740",
"status": "active",
"current_period": 8,
"recurrence_period": 2,
"quantity_recurrences": -1,
"trial_days": 0,
"max_retries": 2,
"amount": "5.00",
"retry_interval": 2,
"paid_payments_quantity": 8,
"parent_order": "6a7377f9-da5d-47a8-ba43-dd6c80e46059",
"paymentMethod": "credit_card",
"customer": {
"name": "Tulio sabino",
"email": "tokipi8246@gamebcs.com",
"phone": "5534991462388",
"birthDate": null,
"docNumber": "59089477098",
"docType": "cpf"
},
"product": "f947c21c-d8f0-41a1-a0a6-fede9f27b3b7",
"offer": "jbwjmis",
"orders": [
"76c21519-3df3-400d-9c53-3be638a33998",
"70b81b3f-536c-4ac7-a37a-309602bf2f85",
"b7d16391-703d-4ebb-9ea8-79171ace8275",
"196565bf-cebd-483e-816a-ef6c70fd091a",
"1e8a2c5e-bd90-43fe-a6a8-2297ca413803",
"2d732302-985a-426f-b4f7-8a0798123530",
"1f1c81d2-088a-412d-8bb7-3d5269d64f58",
"5b0d0c6d-b31e-43c5-9d4b-471c8cfb608c",
"6a7377f9-da5d-47a8-ba43-dd6c80e46059"
],
"next_payment_date": "2025-04-08T14:43:39.724743-03:00",
"createdAt": "2025-04-08T14:41:42.247628-03:00",
"updatedAt": "2025-04-08T14:41:42.247138-03:00",
"canceledAt": null
},
"subscription_period": 2,
"checkoutUrl": null,
"status": "paid",
"baseAmount": 5,
"discount": null,
"amount": 5,
"commissions": [
{
"user": "tulio.ax@hotmail.com",
"totalAmount": 2.36,
"percentage": 100,
"type": "producer"
}
],
"fees": 2.64,
"couponCode": null,
"reason": null,
"refund_reason": null,
"paymentMethod": "credit_card",
"paymentMethodName": "Cartão de Crédito",
"installments": 1,
"utm_source": null,
"utm_medium": null,
"utm_campaign": null,
"utm_term": null,
"utm_content": null,
"sck": null,
"fbc": null,
"fbp": null,
"paidAt": "2025-04-08T14:43:43.575271-03:00",
"createdAt": "2025-04-08T14:43:43.022292-03:00",
"refundedAt": null,
"chargedbackAt": null,
"card": {
"holderName": "Tulio sabino",
"lastDigits": "4242",
"brand": null
}
}
}

Exemplo de webhook em cancelamento de pagamento recorrente.
{
"secret": "76a41004-31bb-4d99-a7d2-6f1a24ecfe3f",
"event": "subscription_canceled",
"data": {
"id": "2a348a25-2c26-4c1e-a905-436d52f8e29e",
"refId": "6JPuFrA",
"customer": {
"name": "Teste",
"birthDate": null,
"email": "teste",
"phone": "222222222",
"docNumber": "222222222"
},
"affiliate": "",
"offer": {
"id": "7oYLwWh",
"name": "Novo produto",
"price": 25
},
"offer_type": "main",
"product": {
"name": "Novo produto123",
"id": "fe46d976-f644-4a07-b8b7-4751d8e26362",
"short_id": "73P8S9C",
"supportEmail": "2222@teste.com",
"type": "subscription",
"invoiceDescription": ""
},
"parent_order": "5hswfeK",
"subscription": {
"id": "21401964-7dd5-4f24-a5d1-22ce473968c7",
"status": "canceled",
"current_period": 11,
"recurrence_period": 7,
"quantity_recurrences": 0,
"trial_days": 7,
"max_retries": 3,
"amount": "25.00",
"retry_interval": 1,
"paid_payments_quantity": 11,
"retention": "01:21:13.125077",
"parent_order": "b3476e6e-c734-42e9-81d5-01facf147cc1",
"paymentMethod": "credit_card",
"customer": {
"name": "Teste",
"email": "teste@gmail.com",
"phone": "222222222222",
"birthDate": null,
"docNumber": "222222222222",
"docType": "cpf"
},
"product": "fe46d976-f644-4a07-b8b7-4751d8e26362",
"offer": "7oYLwWh",
"orders": [
"2a348a25-2c26-4c1e-a905-436d52f8e29e",
"6ad83986-ec3c-42cb-90dd-bf77eecdf81f",
"f79ef989-09d0-4393-bba8-3147bf51702e",
"8e744055-0926-47b4-85df-e0631723810e",
"0873de05-64f5-470c-bd44-49d6721c28b3",
"f61171b5-0183-4c5a-be51-adc44ef0986c",
"45d37314-c0f7-4086-b376-53866c5ea2b3",
"fd663542-8884-4878-ad76-9fa19542234e",
"8ce5bb92-9839-4e06-bf75-c3215a159846",
"d5c9bad2-0c31-4955-8cf8-e78d0b888014",
"3f6e0625-7439-4a51-a731-98a61007f702",
"b3476e6e-c734-42e9-81d5-01facf147cc1"
],
"next_payment_date": null,
"createdAt": "2025-05-15T14:58:20.210928-03:00",
"updatedAt": "2025-05-15T14:58:20.198680-03:00",
"canceledAt": "2025-05-15T16:19:33.336005-03:00"
},
"subscription_period": 11,
"checkoutUrl": null,
"status": "scheduled",
"baseAmount": 25,
"discount": null,
"amount": 25,
"commissions": [
{
"user": "teste@gmail.com",
"totalAmount": 21.76,
"percentage": 100,
"type": "producer"
}
],
"fees": 3.24,
"couponCode": null,
"reason": null,
"refund_reason": null,
"paymentMethod": "credit_card",
"paymentMethodName": "CartÃ£o de CrÃ©dito",
"installments": 1,
"utm_source": null,
"utm_medium": null,
"utm_campaign": null,
"utm_term": null,
"utm_content": null,
"sck": null,
"fbc": null,
"fbp": null,
"paidAt": null,
"createdAt": "2025-05-15T16:15:44.013327-03:00",
"refundedAt": null,
"chargedbackAt": null,
"card": {
"holderName": "teste",
"lastDigits": "4242",
"brand": null
}
}
}

Exemplo de webhook em renovação de pagamento recorrente.
{
"secret": "9000e9a0-341c-4755-8a91-c93da53a00e3",
"event": "subscription_renewed",
"data": {
"id": "da74a88a-418a-4417-bf41-8a7c27ac008a",
"refId": "3xFSuNu",
"customer": {
"name": "Teste",
"birthDate": null,
"email": "eeeeeeeee@mobilesm.com",
"phone": "2222222222",
"docNumber": "22222222222"
},
"affiliate": "",
"offer": {
"id": "yxAaYp5",
"name": "Subscription [Dev]",
"price": 21.31
},
"offer_type": "main",
"product": {
"name": "Subscription [Dev]",
"id": "9b09f315-ea1d-4d93-a994-c63e645dcd6a",
"short_id": "hETDPKN",
"supportEmail": "teste@teste.com",
"type": "subscription",
"invoiceDescription": null
},
"parent_order": "4RXy3sh",
"subscription": {
"id": "398573e9-59de-41eb-b02c-620c2863f9f2",
"status": "active",
"current_period": 2,
"recurrence_period": 30,
"quantity_recurrences": -1,
"trial_days": 0,
"max_retries": 3,
"amount": "21.31",
"retry_interval": 1,
"paid_payments_quantity": 2,
"retention": "00:00:00.539600",
"parent_order": "277712cf-eec1-48c5-bc20-d8e94d59d17c",
"paymentMethod": "credit_card",
"customer": {
"name": "Tulio Sabino",
"email": "didipic225@mobilesm.com",
"phone": "5511999997777",
"birthDate": null,
"docNumber": "61068007079",
"docType": "cpf"
},
"product": "9b09f315-ea1d-4d93-a994-c63e645dcd6a",
"offer": "yxAaYp5",
"orders": [
"da74a88a-418a-4417-bf41-8a7c27ac008a",
"277712cf-eec1-48c5-bc20-d8e94d59d17c"
],
"next_payment_date": "2025-04-22T16:09:04.032882-03:00",
"createdAt": "2025-04-23T15:00:56.058452-03:00",
"updatedAt": "2025-04-23T15:00:56.054844-03:00",
"canceledAt": null
},
"subscription_period": 2,
"checkoutUrl": null,
"status": "paid",
"baseAmount": 21.31,
"discount": null,
"amount": 5.0,
"commissions": [
{
"user": "teste@teste.com",
"totalAmount": 2.16,
"percentage": 100.0,
"type": "producer"
}
],
"fees": 2.84,
"couponCode": null,
"reason": null,
"refund_reason": null,
"paymentMethod": "credit_card",
"paymentMethodName": "Cart\u00e3o de Cr\u00e9dito",
"installments": 1,
"utm_source": null,
"utm_medium": null,
"utm_campaign": null,
"utm_term": null,
"utm_content": null,
"sck": null,
"fbc": null,
"fbp": null,
"paidAt": "2025-04-23T15:07:38.683315-03:00",
"createdAt": "2025-04-23T15:07:38.600819-03:00",
"refundedAt": null,
"chargedbackAt": null,
"card": {
"holderName": "Tulio Sabino",
"lastDigits": "4242",
"brand": null
}
}
}

## Como identificar pelo JSON o evento que está sendo enviado?

O parâmetro `event` é enviado em todos os eventos, por meio dele é possível identificar o evento:

→ Se estiver recebendo o evento de **Boleto gerado**, o valor será `boleto_gerado`.

→ Se estiver recebendo o evento de **Pix gerado**, o valor será `pix_gerado`.

→ Se estiver recebendo o evento de **picpay gerado**, o valor será `picpay_gerado`.

→ Se estiver recebendo o evento de **Compra aprovada**, este terá valor `purchase_approved`.

→ Se estiver recebendo o evento de **Compra recusada**, este terá valor `purchase_refused`.

→ Se estiver recebendo o evento de **Reembolso**, o valor será `refund`.

→ Se estiver recebendo o evento de **Chargeback**, o valor será `chargeback`.

→ Se estiver recebendo o evento de **Abandono de checkout**, o valor será `checkout_abandonment`.
