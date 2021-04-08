/**
 * Provides console output and display of DisplayObjects on a stage to help with debugging layout and other visual issues
 */
export default class StageInspector {
  /**
   * @access public
   * @param {!Stage} stage - stage to inspect
   */
  constructor(stage) {
    this._updateDisplay = this._updateDisplay.bind(this);

    /**
     * stage that is registered for inspection
     * @access private
     */
    this._stage = stage;

    /**
     * Filters for which properties to display with the show function (does not affect dump).  The field names of this object are primarially the field names of the DisplayObject being inspected, but there are a few additional ones such as bounds, pos, regPos, width, and height that display information outside the info container.
     * @access public
     */
    this.propFilters = {
      bounds: true,
      pos:    true,
      regPos: true,
      width:  true,
      height: true,
      name:   true,
      id:     true,
      x:      true,
      y:      true,
      scaleX: true,
      scaleY: true,
    };

    /**
     * array of colors to use for the showing the different levels of nesting when drawing the DisplayObjects created by the show function.  This must be set to a non-empty array of strings.
     * @access public
     */
    this.nestColors = [
      '#ff00ff',
      '#7e00ff',
      '#ff0083',
      '#03ff00',
      '#b300b3',
      '#5800b3',
      '#b3005c',
      '#02b300',
      '#4c004c',
      '#25004c',
      '#4c0027',
      '#004c00',
    ];

    /**
     * container for placing the additional DisplayObjects created by the show function
     * @access private
     */
    this._container = new createjs.Container();
    this._container.name = 'si_ui_container';

    this._updateOnDraw = true;
  }

  /**
   * Retrieves whether to update the GUI displayed with the show function each time the stage is redrawn
   * @returns {boolean} true on each stage redraw, false just the next stage redraw
   * @access public
   */
  get updateOnDraw() {
    return this._updateOnDraw;
  }

  /**
   * Sets whether to update the GUI displayed with the show function on each time the stage is redrawn or not
   * @access public
   * @param {boolean} val - true if the DisplayObject data should be updated for each stage redraw, false for just the next stage redraw
   */
  set updateOnDraw(val) {
    if (this.showing && val !== this._updateOnDraw) {
      if (this._updateOnDraw) {
        this._stage.removeEventListener('drawstart', this._updateDisplay);
      }
      else {
        this._stage.addEventListener('drawstart', this._updateDisplay);
      }
    }

    this._updateOnDraw = val;
  }

  /**
   * Retrieves whether configured for showing DisplayObject data on the next stage render pass or not
   * @access public
   * @returns {boolean} true if ready to show, false otherwise
   */
  get showing() {
    return this._stage.children.length > 0 && this._stage.children[this._stage.children.length - 1] === this._container;
  }

  /**
   * Adds items to the stage in the stage inspector container to display the configured information about other DisplayObjects on the stage.  If the StageInspector instance's updateOnDraw field is true, then this display will automatically update as the stage is redrawn.  Otherwise the data displayed will be for just the next stage redraw.
    * @access public
    * @param {?Array} [filters] - An array of ids (numbers), names (strings), or objects where only DisplayObjects that match at least one filter will be displayed.  Wildcards and regexes are not supported for names, only exact match.
   */
  show(filters) {
    this.hide();

    this._filters = filters;
    if (this.updateOnDraw) {
      this._stage.addEventListener('drawstart', this._updateDisplay);
    }
    else {
      this._updateDisplay();
    }
    this._stage.addChild(this._container);
  }

  /**
   * Hide the data displayed by the show function
   * @access public
   */
  hide() {
    if (this._container) {
      if (this.updateOnDraw) {
        this._stage.removeEventListener('drawstart', this._updateDisplay);
      }
      this._container.removeAllChildren();
      this._stage.removeChild(this._container);
    }
  }

  /**
   * Dumps information about the stage and its DisplayObjects to the console.
   * @access public
   * @param {?Array} [objects] - An array of ids (numbers), names (strings), or objects where only DisplayObjects that match at least one filter will be displayed.  Wildcards and regexes are not supported for names, only exact match.
   */
  dump(objects) {
    if (objects) {
      console.group('Display objects');
      objects.forEach((obj) => {
        if (this._isString(obj)) {
          obj = this.getObjectByName(obj);
        }
        else if (this._isNumber(obj)) {
          obj = this.getObjectById(obj);
        }
        this._dumpObject(obj, this._getObjectDisplayName(obj), true);
      });
      console.groupEnd();
    }
    else if (this._stage) {
      this._dumpObject(this._stage, 'Stage (id=' + this._stage.id + ')', true);
    }
    else {
      console.log('No stage or objects configured for inspection');
    }
  }

  /**
   * Makes it so when clicking the stage, information about any clicked DisplayObjects is dumped to the console.  The normal click and related events are blocked while this is enabled.
   * @access public
   */
  enableClickToDump() {
    if (!this._dumpListeners) {
      this._dumpListeners = [
        {
          type: 'click',
          listener: this._stage.on('click', this._clickToDumpListener, this, false, null, true),
        },
      ];

      const suppressEvents = [ 'mousedown', 'pressup', 'dblclick', 'mouseout', 'mouseover', 'pressmove' ];
      suppressEvents.forEach((type) => {
        this._dumpListeners.push({
          type,
          listener: this._stage.on(type, this._suppressEvent, this, false, null, true),
        });
      });
    }
  }

  /**
   * Removes the click listener from enableClickToDump and re-enables normal mouse interaction with the stage and its DisplayObjects.
   * @access public
   */
  disableClickToDump() {
    if (this._dumpListeners) {
      this._dumpListeners.forEach((listener) => {
        this._stage.off(listener.type, listener.listener, true);
      });
      this._dumpListeners = null;
    }
  }

  /**
   * Retrieves the first DisplayObject that has a name field matching the name argument
   * @access public
   * @param {!string} name - string to match to a DisplayObject's name field
   * @return {DisplayObject} the first matching DisplayObject, or null if there are no matches
   */
  getObjectByName(name) {
    let back;

    if (name.toLowerCase() === 'stage') {
      back = this._stage;
    }
    else {
      back = this._searchForObject(this._stage, (obj) => {
        return obj.name === name;
      });
    }

    return back;
  }

  /**
   * Retrieves the first DisplayObject that has a id field matching the id argument
   * @access public
   * @param {!number} id - number to match to a DisplayObject's id field
   * @return {DisplayObject} the first matching DisplayObject, or null if there are no matches
   */
  getObjectById(id) {
    return this._searchForObject(this._stage, (obj) => {
      return obj.id === id;
    });
  }

  /**
   * Retrieves all DisplayObjects for which func returns true
   * @access public
   * @param {!function(obj: DisplayObject): boolean} func - a function that takes a DisplayObject as an argument and returns true if it should be included in the returned array, or false otherwise
   * @return {DisplayObject[]} an array of all matching DisplayObjects
   */
  getObjectsByCustomSearch(func) {
    return this._searchForObjects(this._stage, func);
  }

  /**
   * Checks if the argument is a string or not
   * @access private
   * @param {!object} obj - item to check
   * @return {boolean} true if obj is a string, false otherwise
   */
  _isString(obj) {
    return (typeof obj) === 'string';
  }

  /**
   * Checks if the argument is a number or not
   * @access private
   * @param {!object} obj - item to check
   * @return {boolean} true if obj is a number, false otherwise
   */
  _isNumber(obj) {
    return Number(obj) === obj && !isNaN(obj);
  }

  /**
   * Updates the stage inspector's DisplayObjects that display info about the stage's DisplayObjects
   * @access private
   */
  _updateDisplay() {
    this._container.removeAllChildren();
    this._stage.children.forEach((child) => {
      if (child != this._container) {
        this._addObjectToContainer(this._container, child);
      }
    });
  }

  /**
   * Event handler for dumping information about a DisplayObject when clicked
   * @access private
   * @param {!Event} evt - an event object
   */
  _clickToDumpListener(evt) {
    const objects = this._stage.getObjectsUnderPoint(evt.stageX, evt.stageY);
    this.dump(objects);
    evt.stopPropagation();
  }

  /**
   * Event handler for preventing mouse events from being processed normally while click to dump is enabled
   * @access private
   * @param {!Event} evt - an event object
   */
  _suppressEvent(evt) {
    evt.stopPropagation();
  }

  /**
   * Since createjs.Text's toString method is overriden, this allows for all DisplayObjects to have a consistent and useful name when dumping a DisplayObject to the console
   * @access private
   * @param {!DisplayObject} obj - DisplayObject to create a uniform console dump name for
   * @return {string} String to display for labeling the DisplayObject
   */
  _getObjectDisplayName(obj) {
    let back;

    if (obj instanceof createjs.Text) {
      back = '[Text (name=' + obj.name + ')]';
    }
    else {
      back = obj.toString();
    }

    back += ' (id=' + obj.id + ')';

    return back;
  }

  /**
   * Retrieves the appropriate color to use when displaying info about a DisplayObject at a particular nesting level
   * @access private
   * @param {!int} nestLevel - 0-based nesting level
   * @return {string} Color to use
   */
  _getNestColor(nestLevel) {
    if (nestLevel > (this.nestColors.length - 1)) {
      return this.nestColors[this.nestColors.length - 1];
    }
    else {
      return this.nestColors[nestLevel];
    }
  }

  /**
   * Recursively dumps information about obj and its children to the console
   * @access private
   * @param {!DisplayObject} obj - DisplayObject to dump info about
   * @param {!string} name - string to identify the DisplayObject's group in the console output
   * @param {!boolean} expand - true if the console group for the object should be initally expanded, false for collapsed
   */
  _dumpObject(obj, name, expand) {
    if (this._container == obj) {
      return;
    }

    if (expand) {
      console.group(name);
    }
    else {
      console.groupCollapsed(name);
    }
    console.log('ref:             ', obj);

    let bounds;
    try {
      bounds = obj.getBounds();
    } catch (err) {
      // suppress the rare case of getBounds throwing an exception instead of returning null
    }

    console.log('visible:         ' + obj.visible);
    console.log('alpha:           ' + obj.alpha);
    console.log('x:               ' + obj.x);
    console.log('y:               ' + obj.y);
    console.log('bounds:          ' + bounds);
    console.log('regX:            ' + obj.regX);
    console.log('regY:            ' + obj.regY);
    console.log('scaleX:          ' + obj.scaleX);
    console.log('scaleY:          ' + obj.scaleY);
    console.log('rotation:        ' + obj.rotation);
    console.log('transformMatrix: ' + obj.transformMatrix);
    console.log('mouseChildren:   ' + obj.mouseChildren);
    console.log('mouseEnabled:    ' + obj.mouseEnabled);
    console.log('cachedStatus:    ' + obj.cacheID);
    console.log('filters:         ' + obj.filters);

    if (obj.children) {
      console.group('Children:');
      obj.children.forEach((child, i) => {
        this._dumpObject(child, this._getObjectDisplayName(child), false);
      });
      console.groupEnd();
    }
    else {
      console.log('Children: None');
    }

    console.groupEnd();
  }

  /**
   * Recursively searches obj and its children for the first DisplayObject for which func returns true
   * @access private
   * @param {!DisplayObject} obj - DisplayObject to check it and its children
   * @param {!function(obj: DisplayObject): boolean} func - a function that takes a DisplayObject as an argument and returns true if it is the matching DisplayObject, or false otherwise
   * @return {DisplayObject} The matching DisplayObject, or null if none is found
   */
  _searchForObject(obj, func) {
    let back = null;

    if (func(obj)) {
      back = obj;
    }
    else if (obj.children) {
      for (let i = 0; i < obj.children.length && !back; i++) {
        const child = obj.children[i];
        back = this._searchForObject(child, func);
      }
    }

    return back;
  }

  /**
   * Recursively searches obj and its children for all DisplayObjects for which func returns true
   * @access private
   * @param {!DisplayObject} obj - DisplayObject to check it and its children
   * @param {!function(obj: DisplayObject): boolean} func - a function that takes a DisplayObject as an argument and returns true if it is the matching DisplayObject, or false otherwise
   * @return {DisplayObject[]} Array of all matching DisplayObjects
   */
  _searchForObjects(obj, func) {
    let back = [];

    if (func(obj)) {
      back.push(obj);
    }
    else if (obj.children) {
      for (let i = 0; i < obj.children.length; i++) {
        const child = obj.children[i];
        back = back.concat(this._searchForObjects(child, func));
      }
    }

    return back;
  }

  /**
   * Checks if the DisplayObject matches any of the filters
   * @access private
   * @param {!DisplayObject} obj - DisplayObject to check against filters
   * @return {boolean} true if the DisplayObject matches at least one filter, false if it matches none
   */
  _checkFilters(obj) {
    let back = false;

    for (let i = 0; i < this._filters.length && !back; i++) {
      const filter = this._filters[i];
      if (this._isNumber(filter)) {
        back = obj.id === filter;
      }
      else if (this._isString(filter)) {
        back = obj.name === filter;
      }
      else {
        back = obj === filter;
      }
    }

    return back;
  }

  /**
   * Creates the DisplayObjects that display information about a DisplayObject in the stage.  If the stage's DisplayObject has children, this function will recurse on its children.
   * @access private
   * @param {!Container} container - container to add DisplayObjects to
   * @param {!DisplayObject} obj - DisplayObject to display information about
   * @param {!int} [nestLevel=0] - 0-based nesting level of obj
   */
  _addObjectToContainer(container, obj, nestLevel = 0) {
    if (obj) {
      // do child objects first so that their display is behind their parent
      if (Array.isArray(obj.children)) {
        obj.children.forEach((child) => {
          this._addObjectToContainer(container, child, nestLevel + 1);
        });
      }

      const includeObj = !this._filters || this._checkFilters(obj);
      if (includeObj) {
        let bounds;
        try {
          if (obj.frameBounds && obj.frameBounds.length > 0 && Number.isInteger(obj.currentFrame) && obj.currentFrame >= obj.frameBounds.length) {
            // If a createjs.MovieClip is told to gotoAndPlay without being stopped, it will end up with a currentFrame 1 index off the end of the frameBounds array.
            // That results in getBounds throwing an exception when it tries to copy the frameBounds at the current frame.  So, instead of letting that happen, just use
            // the last entry in the frameBounds array when that case is detected.
            bounds = obj.frameBounds[obj.frameBounds.length - 1];
          } else {
            bounds = obj.getBounds();
          }
        } catch (err) {
          // ignore, this is mainly for the case of undefined bounds
        }
        if (!bounds) {
          return;
        }
        const globalPos = obj.parent.localToGlobal(obj.x, obj.y);

        const ul = obj.localToGlobal(bounds.x, bounds.y);
        const lr = obj.localToGlobal(bounds.x + bounds.width, bounds.y + bounds.height);
        const displayBounds = {
          x: ul.x,
          y: ul.y,
          width: lr.x - ul.x,
          height: lr.y - ul.y,
        };

        const nestColor = this._getNestColor(nestLevel);
        if (this.propFilters.bounds) {
          this._displayBounds(container, obj, bounds, displayBounds, globalPos, nestColor);
        }
        if (this.propFilters.pos) {
          this._displayPos(container, obj, bounds, globalPos, nestColor);
        }
        if (this.propFilters.regPos) {
          this._displayRegPos(container, obj, bounds, globalPos, nestColor);
        }
        if (this.propFilters.width) {
          this._displayWidth(container, obj, bounds, displayBounds, globalPos, nestColor);
        }
        if (this.propFilters.height) {
          this._displayHeight(container, obj, bounds, displayBounds, globalPos, nestColor);
        }

        const infoContainer           = new createjs.Container();
        const infoContainerBackground = new createjs.Shape();
        infoContainer.name = 'si_infoContainer_' + obj.id;
        infoContainer.x = displayBounds.x;
        infoContainer.y = displayBounds.y;
        infoContainer.addChild(infoContainerBackground);

        let nextY = 0;

        // fields to exclude from output due to being displayed already or in a special order next
        const specialKeys = [ 'id', 'name' ];

        if (this.propFilters.id) {
          nextY = this._displayMember(infoContainer, obj, bounds, globalPos, nextY, 'id', nestColor);
        }
        if (this.propFilters.name) {
          nextY = this._displayMember(infoContainer, obj, bounds, globalPos, nextY, 'name', nestColor);
        }
        if (this.propFilters.parentId) {
          nextY = this._displayParentId(infoContainer, obj, bounds, globalPos, nextY, nestColor);
        }

        for (const key of Object.keys(obj)) {
          if (key.indexOf('_') != 0 && specialKeys.indexOf(key) == -1) {
            if (this.propFilters[key] && !(obj[key] instanceof Object)) {
              nextY = this._displayMember(infoContainer, obj, bounds, globalPos, nextY, key, nestColor);
            }
          }
        }

        if (nextY > 0) {
          this._drawInfoBackground(infoContainer, infoContainerBackground, displayBounds);
          container.addChild(infoContainer);
        }
      }
    }
  }

  /**
   * Draws the background for an infoContainer
   * @access private
   * @param {!Contaier} container - infoContainer to draw the background for
   * @param {!DisplayObject} bg - Shape that will be the infoContainer's background
   * @param {!Rectangle} objBounds - bounds of the DisplayObject converted to global coordinates that the infoContainer will display information for
   */
  _drawInfoBackground(container, bg, objBounds) {
    const infoBounds = container.getBounds();
    container.x += objBounds.width / 2 - infoBounds.width / 2;
    container.y += objBounds.height / 2 - infoBounds.height / 2;
    bg.graphics
      .setStrokeStyle(1)
      .setStrokeDash([2, 2])
      .beginStroke('#000000')
      .beginFill('#ffffff')
      .drawRect(-3, -3, infoBounds.width + 6, infoBounds.height + 6);
    bg.alpha = .75;
  }

  /**
   * Draws the bounds of a DisplayObject
   * @access private
   * @param {!Container} container - the stage inspector container to add DisplayObjects to
   * @param {!DisplayObject} obj - the DisplayObject to display information about
   * @param {!Rectangle} bounds - result of obj.getBounds()
   * @param {!Rectangle} displayBounds - bounds converted to global coordinates
   * @param {!Point} globalPos - obj's position relative to the stage
   * @param {!string} nestColor - color to use to display info
   */
  _displayBounds(container, obj, bounds, displayBounds, globalPos, nestColor) {
    const rect = new createjs.Shape();
    rect.name = 'si_bounds_' + obj.id;
    rect.graphics.setStrokeStyle(1);
    rect.graphics.beginStroke(nestColor);
    rect.graphics.drawRect(0, 0, displayBounds.width, displayBounds.height);
    rect.x = displayBounds.x;
    rect.y = displayBounds.y;
    container.addChild(rect);

    const text = new createjs.Text(bounds.x.toFixed(3) + ',' + bounds.y.toFixed(3), undefined, nestColor);
    text.name = 'si_boundsPos_' + obj.id;
    const textBounds = text.getBounds();
    text.x = displayBounds.x - textBounds.width - 2;
    text.y = displayBounds.y + 2;
    container.addChild(text);
  }

  /**
   * Draws the position of a DisplayObject
   * @access private
   * @param {!Container} container - the stage inspector container to add DisplayObjects to
   * @param {!DisplayObject} obj - the DisplayObject to display information about
   * @param {!Rectangle} bounds - result of obj.getBounds()
   * @param {!Point} globalPos - obj's position relative to the stage
   * @param {!string} nestColor - color to use to display info
   */
  _displayPos(container, obj, bounds, globalPos, nestColor) {
    const shape = new createjs.Shape();
    shape.name = 'si_posMarker_' + obj.id;
    shape.graphics
      .setStrokeStyle(1)
      .beginStroke(nestColor)
      .moveTo(-4,  0)
      .lineTo( 4,  0)
      .moveTo( 0, -4)
      .lineTo( 0,  4);
    shape.x = globalPos.x;
    shape.y = globalPos.y;
    container.addChild(shape);

    const text = new createjs.Text(obj.x.toFixed(3) + ',' + obj.y.toFixed(3), undefined, nestColor);
    text.name = 'si_pos_' + obj.id;
    text.x = globalPos.x;
    text.y = globalPos.y;
    container.addChild(text);
  }

  /**
   * Draws the registration point of a DisplayObject
   * @access private
   * @param {!Container} container - the stage inspector container to add DisplayObjects to
   * @param {!DisplayObject} obj - the DisplayObject to display information about
   * @param {!Rectangle} bounds - result of obj.getBounds()
   * @param {!Point} globalPos - obj's position relative to the stage
   * @param {!string} nestColor - color to use to display info
   */
  _displayRegPos(container, obj, bounds, globalPos, nestColor) {
    // repeat shape from _displayPos in case reg pos is enabled and pos isn't
    const shape = new createjs.Shape();
    shape.name = 'si_posMarker_' + obj.id;
    shape.graphics
      .setStrokeStyle(1)
      .beginStroke(nestColor)
      .moveTo(-4,  0)
      .lineTo( 4,  0)
      .moveTo( 0, -4)
      .lineTo( 0,  4);
    shape.x = globalPos.x;
    shape.y = globalPos.y;
    container.addChild(shape);

    const text = new createjs.Text(obj.regX.toFixed(3) + ',' + obj.regY.toFixed(3), undefined, nestColor);
    text.name = 'si_regPosText_' + obj.id;
    text.x = globalPos.x + 2;
    text.y = globalPos.y - 12;
    container.addChild(text);
  }

  /**
   * Draws the width of a DisplayObject horizontally centered just below the top edge of the bounds
   * @access private
   * @param {!Container} container - the stage inspector container to add DisplayObjects to
   * @param {!DisplayObject} obj - the DisplayObject to display information about
   * @param {!Rectangle} bounds - result of obj.getBounds()
   * @param {!Rectangle} displayBounds - bounds converted to global coordinates
   * @param {!Point} globalPos - obj's position relative to the stage
   * @param {!string} nestColor - color to use to display info
   */
  _displayWidth(container, obj, bounds, displayBounds, globalPos, nestColor) {
    const text = new createjs.Text(bounds.width.toFixed(3), undefined, nestColor);
    const textBounds = text.getBounds();
    text.name = 'si_width_' + obj.id;
    text.x = displayBounds.x + displayBounds.width / 2 - textBounds.width / 2;
    text.y = displayBounds.y + 2;
    container.addChild(text);
  }

  /**
   * Draws the height of a DisplayObject vertically centered just inside the left edge of the bounds.  The text is also rotated 90 degrees to be along the edge instead of perpendicular to it.
   * @access private
   * @param {!Container} container - the stage inspector container to add DisplayObjects to
   * @param {!DisplayObject} obj - the DisplayObject to display information about
   * @param {!Rectangle} bounds - result of obj.getBounds()
   * @param {!Rectangle} displayBounds - bounds converted to global coordinates
   * @param {!Point} globalPos - obj's position relative to the stage
   * @param {!string} nestColor - color to use to display info
   */
  _displayHeight(container, obj, bounds, displayBounds, globalPos, nestColor) {
    const text = new createjs.Text(bounds.height.toFixed(3), undefined, nestColor);
    const textBounds = text.getBounds();
    text.name = 'si_height_' + obj.id;
    text.regY = textBounds.height / 2;
    text.x = displayBounds.x + textBounds.height / 2;
    text.y = displayBounds.y + displayBounds.height / 2 + textBounds.height / 2;
    text.rotation = -90;
    container.addChild(text);
  }

  /**
   * Draws the parent id of a DisplayObject
   * @access private
   * @param {!Container} container - the stage inspector container to add DisplayObjects to
   * @param {!DisplayObject} obj - the DisplayObject to display information about
   * @param {!Rectangle} bounds - result of obj.getBounds()
   * @param {!Point} globalPos - obj's position relative to the stage
   * @param {!number} nextY - y coordiate in to use for placing the text in the infoContainer
   * @param {!string} nestColor - color to use to display info
   * @return {number} new nextY value for the next item in the infoContainer
   */
  _displayParentId(container, obj, bounds, globalPos, nextY, nestColor) {
    const text = new createjs.Text('Parent ID: ' + obj.parent.id, undefined, nestColor);
    text.name = 'si_parentId_' + obj.id;
    text.y = nextY;
    container.addChild(text);

    return nextY + text.getMeasuredLineHeight();
  }

  /**
   * Draws the info about a particular member field of a DisplayObject
   * @access private
   * @param {!Container} container - the stage inspector container to add DisplayObjects to
   * @param {!DisplayObject} obj - the DisplayObject to display information about
   * @param {!Rectangle} bounds - result of obj.getBounds()
   * @param {!Point} globalPos - obj's position relative to the stage
   * @param {!number} nextY - y coordiate in to use for placing the text in the infoContainer
   * @param {!string} member - name of the field to display info for
   * @param {!string} nestColor - color to use to display info
   * @return {number} new nextY value for the next item in the infoContainer
   */
  _displayMember(container, obj, bounds, globalPos, nextY, member, nestColor) {
    let val = obj[member];
    if (Number(val) === val && (val % 1) !== 0) {
      val = val.toFixed(3);
    }
    const text = new createjs.Text(member + ': ' + val, undefined, nestColor);
    text.name = 'si_' + member + '_' + obj.id;
    text.y = nextY;
    container.addChild(text);

    return nextY + text.getMeasuredLineHeight();
  }
}

// to help with debugging through the console
window.StageInspector = StageInspector;
