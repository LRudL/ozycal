export let ui = {
    interface: null, // currently, just the fullcalendar calendar
    state: null, // see state.js
    isInitialized: function() {
        return this.interface && this.state;
    },
    promptUser: function(promptText) {
        return prompt(promptText);
    },
    updateSelectedTimeLine: function(time) {
        if (this.state.currentMode !== "time") {
            return;
        }
        var nowLineEvent = this.interface.getEventById('selected-time');

        if (nowLineEvent) {
            nowLineEvent.setStart(time);
            nowLineEvent.setEnd(new Date(time.getTime() + 60000)); // Ensure the end time is updated to maintain 1 minute duration
        } else {
            this.enableSelectedTimeLine()
        }
        this.interface.render();
    },
    enableSelectedTimeLine: function() {
        this.interface.addEvent({
            id: 'selected-time',
            start: this.state.selectedTime,
            end: new Date(this.state.selectedTime.getTime() + 60000), // 1 minute duration
            className: 'selected-time',
        });
        this.interface.render()
    },
    disableSelectedTimeLine: function() {
        this.interface.getEventById("selected-time").remove();
        this.interface.render()
    },
    updateSelectedEvent: function() {
        // this does nothing because currently handled by fullcalendar magic
        this.interface.render()
        return;
    },
    promptUserForEventName: function() {
        var eventName = this.promptUser("Enter the name of the event:");
        return eventName;
    },
    addEvent: function(newEvent) {
        this.interface.addEvent(newEvent);
    },
}

export function initializeUi(calendar_interface, state) {
    ui.interface = calendar_interface;
    ui.state = state;
    console.assert(ui.isInitialized(), "ui failed to initialize");
}