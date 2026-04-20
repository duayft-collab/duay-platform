/* ENTERPRISE-FLOW-NETWORK-001 PARÇA 2: Events Katalog */
(function() {
  'use strict';

  window.EV = Object.freeze({
    /* Teklif */
    OFFER_CREATED:          'offer.created',
    OFFER_SENT:             'offer.sent',
    OFFER_ACCEPTED:         'offer.accepted',
    OFFER_REJECTED:         'offer.rejected',
    OFFER_EXPIRED:          'offer.expired',

    /* Sipariş */
    ORDER_CREATED:          'order.created',
    ORDER_CONFIRMED:        'order.confirmed',
    ORDER_CANCELLED:        'order.cancelled',
    ORDER_COMPLETED:        'order.completed',

    /* Satınalma */
    PURCHASE_REQUESTED:     'purchase.requested',
    PURCHASE_APPROVED:      'purchase.approved',
    PURCHASE_ORDERED:       'purchase.ordered',
    PURCHASE_RECEIVED:      'purchase.received',

    /* Ödeme */
    PAYMENT_PLANNED:        'payment.planned',
    PAYMENT_MADE:           'payment.made',
    PAYMENT_RECEIVED:       'payment.received',
    PAYMENT_OVERDUE:        'payment.overdue',
    PAYMENT_CANCELLED:      'payment.cancelled',

    /* Lojistik */
    SHIPMENT_PLANNED:       'shipment.planned',
    SHIPMENT_READY:         'shipment.ready',
    SHIPMENT_LOADED:        'shipment.loaded',
    SHIPMENT_IN_TRANSIT:    'shipment.in_transit',
    SHIPMENT_DELIVERED:     'shipment.delivered',

    /* İhracat */
    EXPORT_DOCUMENTS_READY: 'export.documents_ready',
    EXPORT_CLEARED:         'export.cleared',
    EXPORT_COMPLETED:       'export.completed',

    /* Cari */
    CUSTOMER_POTENTIAL:     'customer.potential',
    CUSTOMER_APPROVED:      'customer.approved',
    CUSTOMER_ARCHIVED:      'customer.archived'
  });

  console.log('[EV] Events Katalog yüklü:', Object.keys(window.EV).length);
})();
