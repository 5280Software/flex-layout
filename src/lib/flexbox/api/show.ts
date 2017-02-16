/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  Renderer,
  SimpleChanges,
  Self,
  Optional, Inject
} from '@angular/core';

import {Subscription} from 'rxjs/Subscription';
import 'rxjs/add/operator/filter';

import {BaseFxDirective} from './base';
import {MediaChange} from '../../media-query/media-change';
import {MediaMonitor} from '../../media-query/media-monitor';

import {LayoutDirective} from './layout';

import {EventBusService, EventBusFilter} from '../../utils/event-bus-service';
import {ShowHideConnector, ConnectorEvents} from '../utils/show-hide-connector';


const FALSY = ['false', false, 0];

/**
 * 'show' Layout API directive
 *
 */
@Directive({
  selector: `
  [fxShow],
  [fxShow.xs],
  [fxShow.gt-xs],
  [fxShow.sm],
  [fxShow.gt-sm],
  [fxShow.md],
  [fxShow.gt-md],
  [fxShow.lg],
  [fxShow.gt-lg],
  [fxShow.xl]
`
})
export class ShowDirective extends BaseFxDirective implements OnInit, OnChanges, OnDestroy {

  /**
   * Subscription to the parent flex container's layout changes.
   * Stored so we can unsubscribe when this directive is destroyed.
   */
  protected _layoutWatcher: Subscription;
  protected _connectorWatcher: Subscription;

  @Input('fxShow')       set show(val) {
    this._cacheInput("show", val);
  }

  @Input('fxShow.xs')    set showXs(val) {
    this._cacheInput('showXs', val);
  }

  @Input('fxShow.gt-xs') set showGtXs(val) {
    this._cacheInput('showGtXs', val);
  };

  @Input('fxShow.sm')    set showSm(val) {
    this._cacheInput('showSm', val);
  };

  @Input('fxShow.gt-sm') set showGtSm(val) {
    this._cacheInput('showGtSm', val);
  };

  @Input('fxShow.md')    set showMd(val) {
    this._cacheInput('showMd', val);
  };

  @Input('fxShow.gt-md') set showGtMd(val) {
    this._cacheInput('showGtMd', val);
  };

  @Input('fxShow.lg')    set showLg(val) {
    this._cacheInput('showLg', val);
  };

  @Input('fxShow.gt-lg') set showGtLg(val) {
    this._cacheInput('showGtLg', val);
  };

  @Input('fxShow.xl')    set showXl(val) {
    this._cacheInput('showXl', val);
  };

  /**
   *
   */
  constructor(monitor: MediaMonitor,
              elRef: ElementRef,
              renderer: Renderer,
              @Inject(ShowHideConnector) protected _connector: EventBusService,
              @Optional() @Self() protected _layout: LayoutDirective) {

    super(monitor, elRef, renderer);

    /**
     * The Layout can set the display:flex (and incorrectly affect the Hide/Show directives.
     * Whenever Layout [on the same element] resets its CSS, then update the Hide/Show CSS
     */
    if (_layout) {
      this._layoutWatcher = _layout.layout$.subscribe(() => this._updateWithValue());
    }
    this._display = this._getDisplayStyle();  // re-invoke override to use `this._layout`
  }

  // *********************************************
  // Lifecycle Methods
  // *********************************************

  /**
   * Override accessor to the current HTMLElement's `display` style
   * Note: Show/Hide will not change the display to 'flex' but will set it to 'block'
   * unless it was already explicitly defined.
   */
  protected _getDisplayStyle(): string {
    let element: HTMLElement = this._elementRef.nativeElement;
    return (element.style as any)['display'] || (this._layout ? "flex" : "block");
  }


  /**
   * On changes to any @Input properties...
   * Default to use the non-responsive Input value ('fxShow')
   * Then conditionally override with the mq-activated Input's current value
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['show'] != null || this._mqActivation) {
      this._updateWithValue();
    }
  }

  /**
   * After the initial onChanges, build an mqActivation object that bridges
   * mql change events to onMediaQueryChange handlers
   */
  ngOnInit() {
    this._activateReponsive();
    this._activateConnector();

    if (!this._delegateToHide()) {
      this._updateWithValue();
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    if (this._layoutWatcher) {
      this._layoutWatcher.unsubscribe();
    }
    if (this._connectorWatcher) {
      this._connectorWatcher.unsubscribe();
    }
  }

  // *********************************************
  // Protected methods
  // *********************************************

  /**
   *  Activate the Responsive features using MediaMonitor
   *  and delegating via the ShowHideConnector if needed.
   */
  protected _activateReponsive() {
    let value = this._getDefaultVal("show", true);

    // Build _mqActivation controller
    this._listenForMediaQueryChanges('show', value, (changes: MediaChange) => {
      if (!this._delegateToHide(changes)) {
        this._updateWithValue(changes.value);
      }
    });
  }

  /**
   * Use special ShowHideConnector message-bus to listen
   * for incoming `updateWithShow` messages and trigger
   * `updateWithValue()`.
   *
   *  NOTE: ShowHideConnector supports messaging ONLY for
   *  directives on the same element.
   */
  protected _activateConnector() {
    let isSameElement: EventBusFilter = ((el: any) => (el === this.nativeElement));
    this._connectorWatcher = this._connector
        .observe(ConnectorEvents.announceHasHide)
        .filter(isSameElement)
        .subscribe(() => {
          this._hasHide = true;
          console.log('ConnectorEvents.announceHasHide');
          this._connectorWatcher.unsubscribe();
        });
    // console.log('show::  ' + this.nativeElement);
    this._connector.emit(ConnectorEvents.announceHasShow, this.nativeElement);

  }

  /**
   * If deactivating Show, then delegate action to the Hide directive if it is
   * specified on same element.
   */
  protected _delegateToHide(changes?: MediaChange) {
    let delegate = (!changes || !this.hasKeyValue('show'));
    return delegate && this._hasHide;
  }

  /** Validate the visibility value and then update the host's inline display style */
  protected _updateWithValue(value?: string|number|boolean) {
    value = value || this._getDefaultVal("show", true);
    if (this._mqActivation) {
      value = this._mqActivation.activatedInput;
    }

    let shouldShow = this._validateTruthy(value);
    this._applyStyleToElement(this._buildCSS(shouldShow));
  }


  /** Build the CSS that should be assigned to the element instance */
  protected _buildCSS(show) {
    return {'display': show ? this._display : 'none'};
  }

  /**  Validate the to be not FALSY */
  _validateTruthy(show) {
    return (FALSY.indexOf(show) == -1);
  }

  /**
   * Does this element also have fxHide directives?
   */
  private _hasHide = false;
}
