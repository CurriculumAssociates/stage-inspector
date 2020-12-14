# stage-inspector

## Description
This is a tool to help developers investigate layout issues when using CreateJS.  It does this primarily in two ways.  The first is optionally adding an overlay displaying various properties of a set of DisplayObjects.  The list of which properties are shown this way is configurable.  The second is by displaying information and a reference to various DisplayObjects in the console.  While both of the functions for these approaches take an optional filter array to determine which DisplayObjects to include in their data set, there is also the ability to click on the stage to have all DisplayObjects under that mouse position be used as the filter to the console function.

## CreateJS Version
This module was developed using the 0.8.2 of CreateJS/EaselJS.

## Usage
Since this is a debugging tool, it is expected to be primarily used through the browser's console.  So, while a consuming project may not need to create or use a StageInspector instance, it should import the module to ensure it's included in the consuming project's bundle and therefore available at runtime.  Such as with:
```
import StageInspector from 'stage-inspector'; // eslint-disable-line no-unused-vars
```

Once the module is imported, instances of the StageInspector class can be created either in that file or in the console since the StageInspector class is made available through `window.StageInspector`.  To create an instance, the CreateJS Stage instance that it should inspect needs to be provided:
```
var si = new StageInspector(stage);
```
Since each StageInspector instance is tied to a particular Stage instance, if the consuming project has multiple Stages that should be inspected, then multiple StageInspector instances should be created.

With those setup steps done, there are two primary member functions for getting data to help with debugging.
* `si.show(filters)`: Displays an overlay on the Stage to identify DisplayObjects and provide information about their properties.  Only DisplayObjects that match the filter (discussed in the next section) will be included in the overlay's data.  The overlay can be hidden with `si.hide()`.  It is also worth noting that the `getBounds` function for the DisplayObject must return the bounds rather than null in order to be displayed in the overlay.  If that function returns null, then its children will still be displayed in the overlay if they match the filter and provide their bounds.
* `si.dump(filters)`: For DisplayObjects that match the filter (discussed in the next section) this outputs to the console a reference to the DisplayObject and various information about the DisplayObject that is commonly useful in debugging layout issues.  Part of that info is the same set of information for the DisplayObject's children, if any, which to avoid flooding the screen are initially shown in a collapsed state.  The reference is intended to be used to adjust the DisplayObject's properties to achieve the desired layout in the Stage before making the changes to the consuming project's code base.

These functions can be effectively used together by using the overlay to determine which DisplayObjects need to be adjusted.  Then by using the ids from the overlay of those DisplayObjects as the filter to `si.dump(filters)`.  Then using the reference to the DisplayObject in that output to find the property and value that need to be changed to achieve the desired visual.

Additionally there is `si.enableClickToDump()`.  It adds a click listener to the Stage's capture phase so that all DisplayObjects under the mouse cursor are used as the filter to `si.dump(filters)`.  There are other event listeners (`mousedown`, `pressup`, `dblclick`, `mouseout`, `mouseover`, and `pressmove`) bound to the capture phase by this function so that mouse events are not sent to the DisplayObjects, which otherwise could alter the state of what is trying to be debugged.  This feature can be turned off by calling the corresponding disable function, `si.disableClickToDump()`.

There are also a few functions to help with finding particular DisplayObjects.  They are:
* `si.getObjectByName(name)` which takes the string argument to search against the DisplayObject `name` field for
* `si.getObjectById(id)` which takes an integer argument to search against the DisplayObject `id` field for
* `si.getObjectsByCustomSearch(func)` which takes a predicate function as an argument.  The function will be passed a DisplayObject each time it is called.  Only those DisplayObjects for which the functions returns a truthy value will be included in the returned array.

### Filtering
As mentioned in the previous section, both `si.show` and `si.dump` take an optional argument for filtering which DisplayObjects they will include in their output.  If no filter argument is specified, then the Stage instance and all its descendant DisplayObjects are included.  When the filter argument is used, it is an array where if a DisplayObject matches any entry in the array, then it is included in the output.  The entries in that array can be:
* a number which is compared against DisplayObjects' id field for exact matches
* a string which is compared against DisplayObjects' name field for exact matches
* a DisplayObject which will be included if it is a descendant of the Stage

### Changing Displayed Properties
The data displayed in the overlay is configurable by adjusting the `si.propFilters` object.  If a field of that object has a truthy value and corresponds to a field in a DisplayObject instance that does not have its value set to an object, then it will be included in the overlay data for that DisplayObject.  There are also a few additional fields to `si.propFilters` that this module supports, which unless otherwise noted will be displayed outside of the DisplayObject's info container in the overlay.  These are:
* `bounds` which will draw the bounds of the DisplayObject
* `pos` which displays a + at the DisplayObject's position along with the text for its x and y properties (to 3 decimal places) to the lower-right of the +
* `regPos` which displays a + at the DisplayObject's position along with the text for its regX and regY properties (to 3 decimal places) to the upper-right of the +
* `width` which along the middle of the interior of the bound's top edge the width (to 3 decimal places) of the DisplayObject, in its local coordinate space
* `height` which along the middle of the interior of the bound's left edge the height (to 3 decimal places) of the DisplayObject, in its local coordinate space
* `parentId` includes the id field of the DisplayObject's parent in the info container
Changes to the configuration will be reflected in the overlay the next time it is drawn (which is controlled by how often the Stage redraws and if updateOnDraw is true)

### Display Data for a Frame or Per Stage Redraw
As previously discussed, doing `si.show(filters)` display an informational overlay on the Stage.  By default the data in the overlay updates each time the Stage is redrawn.  That can be turned off by doing `si.updateOnDraw = false` so that the overlay data becomes fixed.  It is worth noting that if `si.updateOnDraw` is false before calling `si.show(filters)`, then the overlay will only be drawn the next time the stage is redrawn.  The show function itself does not trigger a render pass of the Stage.

### Adjusting Colors
By default the overlay displays information about DisplayObjects in different colors.  Which color to use is a combination of the `si.nestColors` array and how many nesting levels the DisplayObject is from the Stage.  If a DisplayObject is more nesting levels away from the Stage than `si.nestColors` has entries for, then the last color in the array is used instead.  The entries of this array are strings for CSS compatible color values.  These colors can be changed either for a particular nesting level or by replacing the whole array.  For example, if you want the third level to be blue (keeping in mind this is a 0-based array):
```
si.nestColors[2] = 'blue';
```
Or if you want the overlay to always display its data in red regardless of nesting level, then you can do:
```
si.nestColors = [ '#ff0000' ];
```
