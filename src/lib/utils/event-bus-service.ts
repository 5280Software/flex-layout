import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';
import {Observable} from 'rxjs/Observable';

import 'rxjs/add/operator/concat';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/filter';

export type EventBusFilter = (value:any, index?: number):Boolean;

/**
 * Generic EventBus service (aka Pub-Sub)
 */
@Injectable()
export class EventBusService<T> {

  /**
   * Observe event stream by type with optional playback of
   * last emitted value.
   *
   * @return Observable<T>
   */
  observe(type: string, replayLast = true): Observable<T> {
    return this._findStream(type)
      .asObservable(replayLast);
  }

  /**
   * Emit data value for specified event stream;
   * internally delegate the emission to the specific stream
   */
  emit(type: string, data: T): void {
    let stream = this._findStream(type);
    if ( stream ){
      stream.emit(data);
    }
  }

  /**
   * Lookup stream. Instantiate and cache if needed
   */
  private _findStream(type: string): EventWatcher<T> {
    let watcher = this._registry.get(type);
    if (!watcher) {
      watcher = new EventWatcher<T>();
      this._registry.set(type, watcher);
    }
    return watcher;
  }

  /**
   * Internal cache of stream instances
   */
  private _registry = new Map<string, EventWatcher<T>>();
}

/**
 * Internal class to simulate a Subject stream for each unique
 * eventType and the optional replay of lastValue.
 */
class EventWatcher<T> {

  get hasLastValue(): boolean {
    return (typeof this.lastValue !== 'undefined');
  }

  /**
   * Publish observable (for operator transforms and subscribe)
   * Optional emit the lastValue to simulate BehaviorSubject
   */
  asObservable(replayLast = false): Observable<T> {
    return replayLast && this.hasLastValue
          ? Observable.of(this.lastValue).concat(this.messages$)
          : this.messages$;
  }

  /**
   * Emit data specific to this stream/eventType
   */
  emit<T>(data: any) {
    this.lastValue = data;
    this.messages$.next(data);
  }

  private get hasLastValue() {
    return (typeof this.lastValue !== undefined);
  }

  private lastValue?: T;
  private messages$: Subject<T> = new Subject<T>();
}
