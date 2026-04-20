(function() {
  'use strict';

  /* ENTERPRISE-FLOW-NETWORK-001 PARÇA 3: State Machine Engine */

  var STATES = Object.freeze({
    offer: {
      states: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
      initial: 'draft',
      transitions: {
        draft:    ['sent', 'expired'],
        sent:     ['accepted', 'rejected', 'expired'],
        accepted: [],
        rejected: [],
        expired:  []
      }
    },
    order: {
      states: ['created', 'confirmed', 'in_production', 'completed', 'cancelled'],
      initial: 'created',
      transitions: {
        created:       ['confirmed', 'cancelled'],
        confirmed:     ['in_production', 'cancelled'],
        in_production: ['completed', 'cancelled'],
        completed:     [],
        cancelled:     []
      }
    },
    purchase: {
      states: ['requested', 'approved', 'ordered', 'received', 'cancelled'],
      initial: 'requested',
      transitions: {
        requested: ['approved', 'cancelled'],
        approved:  ['ordered', 'cancelled'],
        ordered:   ['received', 'cancelled'],
        received:  [],
        cancelled: []
      }
    },
    payment: {
      states: ['planned', 'made', 'received', 'overdue', 'cancelled'],
      initial: 'planned',
      transitions: {
        planned:   ['made', 'received', 'overdue', 'cancelled'],
        overdue:   ['made', 'received', 'cancelled'],
        made:      [],
        received:  [],
        cancelled: []
      }
    },
    shipment: {
      states: ['planned', 'ready', 'loaded', 'in_transit', 'delivered'],
      initial: 'planned',
      transitions: {
        planned:    ['ready'],
        ready:      ['loaded'],
        loaded:     ['in_transit'],
        in_transit: ['delivered'],
        delivered:  []
      }
    }
  });

  /* State history — entityType:entityId → [{state, at, by}] */
  var _history = {};

  function canTransition(entityType, fromState, toState) {
    var def = STATES[entityType];
    if (!def) return false;
    var allowed = def.transitions[fromState] || [];
    return allowed.indexOf(toState) > -1;
  }

  function getValidTransitions(entityType, fromState) {
    var def = STATES[entityType];
    if (!def) return [];
    return (def.transitions[fromState] || []).slice();
  }

  function isValidState(entityType, state) {
    var def = STATES[entityType];
    if (!def) return false;
    return def.states.indexOf(state) > -1;
  }

  function getInitialState(entityType) {
    var def = STATES[entityType];
    return def ? def.initial : null;
  }

  function isTerminal(entityType, state) {
    var def = STATES[entityType];
    if (!def) return false;
    var allowed = def.transitions[state] || [];
    return allowed.length === 0;
  }

  /* Transition — fromState'den toState'e geçmeyi dener
     Başarılı ise Event Bus'a emit eder: {entityType}.state_changed */
  function transition(entityType, entityId, fromState, toState, meta) {
    if (!canTransition(entityType, fromState, toState)) {
      console.warn('[SM] Invalid transition:', entityType, fromState, '→', toState);
      return false;
    }

    var key = entityType + ':' + entityId;
    if (!_history[key]) _history[key] = [];
    _history[key].push({
      from: fromState,
      to: toState,
      at: new Date().toISOString(),
      by: (meta && meta.userId) || null
    });

    // Event Bus entegrasyonu (PARÇA 1)
    if (window.evBus) {
      window.evBus.emit(entityType + '.state_changed', {
        entityId: entityId,
        entityType: entityType,
        from: fromState,
        to: toState,
        meta: meta || {}
      });
    }

    return true;
  }

  function getHistory(entityType, entityId) {
    var key = entityType + ':' + entityId;
    return (_history[key] || []).slice();
  }

  /* Expose */
  window.stateMachine = {
    STATES: STATES,
    canTransition: canTransition,
    getValidTransitions: getValidTransitions,
    isValidState: isValidState,
    getInitialState: getInitialState,
    isTerminal: isTerminal,
    transition: transition,
    getHistory: getHistory,
    _history: _history
  };

  console.log('[SM] State Machine Engine yüklü:', Object.keys(STATES).length, 'entity type');
})();
