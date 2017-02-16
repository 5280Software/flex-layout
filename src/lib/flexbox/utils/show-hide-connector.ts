import {OpaqueToken} from '@angular/core';
import {EventBusService} from '../../utils/event-bus-service';

/**
 *  Opaque Token unique to the flex-layout library.
 *  Use this token when requesting a special EventBusService instance
 *  that allows communication between fxShow and fxHide directives ON THE SAME ELEMENT.
 */
export const ShowHideConnector: OpaqueToken = new OpaqueToken('fxShowHideConnector');

export const  ConnectorEvents = {
  announceHasShow : "isUsingFxShow",
  announceHasHide : "isUsingFxHide"
};


/**
 * Specialized Bridge to link all @Self Show/Hide directive instances
 * to communicate.
 */
export function makeShowHideConnector() {
  return new EventBusService<any>();
}

/**
 *  Provider to return messages bus that allows communication between
 *  fxShow and fxHide directives ON THE SAME ELEMENT.
 */
export const ShowHideConnectorProvider = { // tslint:disable-line:variable-name
  provide: ShowHideConnector,
  useFactory: makeShowHideConnector
};
