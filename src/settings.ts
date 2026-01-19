import {
    FormattingSettingsService,
    formattingSettings
} from "powerbi-visuals-utils-formattingmodel";

/* ===== BAR SETTINGS ===== */
class BarSettings extends formattingSettings.SimpleCard {
    name = "barSettings";
    displayName = "Bar Settings";

    barRadius = new formattingSettings.NumUpDown({
        name: "barRadius",
        displayName: "Column Radius",
        value: 8
    });

    slices = [this.barRadius];
}

/* ===== CONDITIONAL FORMATTING ===== */
class ConditionalFormattingSettings extends formattingSettings.SimpleCard {
    name = "conditionalFormatting";
    displayName = "Conditional Formatting";

    private readonly ruleMode = {
        value: "rule",
        displayName: "Rule-based"
    };

    private readonly fieldMode = {
        value: "field",
        displayName: "Field-based (ColorHex)"
    };

    mode = new formattingSettings.ItemDropdown({
        name: "mode",
        displayName: "Color Mode",
        items: [this.ruleMode, this.fieldMode],
        value: this.ruleMode
    });

    threshold1 = new formattingSettings.NumUpDown({
        name: "threshold1",
        displayName: "Threshold 1",
        value: 0.8
    });

    threshold2 = new formattingSettings.NumUpDown({
        name: "threshold2",
        displayName: "Threshold 2",
        value: 1.0
    });

    naColor = new formattingSettings.ColorPicker({
        name: "naColor",
        displayName: "N/A Color",
        value: { value: "#9E9E9E" }
    });

    applyToLabels = new formattingSettings.ToggleSwitch({
        name: "applyToLabels",
        displayName: "Apply same color to data labels",
        value: true
    });

    slices = [
        this.mode,
        this.threshold1,
        this.threshold2,
        this.naColor,
        this.applyToLabels
    ];
}

/* ===== TARGET MARKER ===== */
class TargetMarkerSettings extends formattingSettings.SimpleCard {
    name = "targetMarker";
    displayName = "Target Marker";

    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Marker Color",
        value: { value: "#000000" }
    });

    thickness = new formattingSettings.NumUpDown({
        name: "thickness",
        displayName: "Marker Thickness",
        value: 2
    });

    slices = [this.color, this.thickness];
}

/* ===== ROOT ===== */
export class VisualSettings extends formattingSettings.Model {
    barSettings = new BarSettings();
    conditionalFormatting = new ConditionalFormattingSettings();
    targetMarker = new TargetMarkerSettings();

    cards = [
        this.barSettings,
        this.conditionalFormatting,
        this.targetMarker
    ];
}

export const formattingSettingsService = new FormattingSettingsService();
