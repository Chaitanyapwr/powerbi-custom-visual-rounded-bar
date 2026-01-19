import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import { VisualSettings, formattingSettingsService } from "./settings";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import {
    createTooltipServiceWrapper,
    ITooltipServiceWrapper
} from "powerbi-visuals-utils-tooltiputils";

import * as d3 from "d3-selection";
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export class Visual implements IVisual {

    private svg: SVGSVGElement;
    private settings: VisualSettings;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private selectionManager: ISelectionManager;
    private host: IVisualHost;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;

        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");
        this.svg.style.overflow = "visible";
        options.element.appendChild(this.svg);

        this.tooltipServiceWrapper = createTooltipServiceWrapper(
            this.host.tooltipService,
            options.element
        );

        this.selectionManager = this.host.createSelectionManager();
    }

    public update(options: VisualUpdateOptions): void {
        this.svg.innerHTML = "";

        const dataView = options.dataViews?.[0];
        if (!dataView?.categorical) return;

        this.settings = formattingSettingsService.populateFormattingSettingsModel(
            VisualSettings,
            dataView
        );

        const categories =
            dataView.categorical.categories?.[0]?.values as string[];

        const actuals =
            dataView.categorical.values?.[0]?.values as number[];

        const targets =
            dataView.categorical.values?.[1]?.values as number[];

        const colorHexes =
            dataView.categorical.values?.[2]?.values as string[];

        if (!categories || !actuals) return;

        const width = options.viewport.width;
        const height = options.viewport.height;

        const margin = { top: 40, right: 20, bottom: 120, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const maxAbsValue = Math.max(
            ...actuals.map(v => Math.abs(v)),
            ...(targets ?? []).map(v => Math.abs(v)),
            1
        );

        const zeroY = margin.top + chartHeight;
        const barWidth = chartWidth / actuals.length;

        /* AXES */
        this.drawLine(margin.left, margin.top, margin.left, zeroY);
        this.drawLine(margin.left, zeroY, margin.left + chartWidth, zeroY);

        actuals.forEach((actual, i) => {

            const target = targets?.[i];

            const barHeight =
                (Math.abs(actual) / maxAbsValue) * chartHeight;

            const x = margin.left + i * barWidth + 10;
            const y = zeroY - barHeight;

            const radius = Math.min(
                this.settings.barSettings.barRadius.value,
                20,
                barHeight / 2
            );

            const fillColor = this.getConditionalColor(
                actual,
                target,
                colorHexes?.[i]
            );

            /* BAR */
            const barPath = this.drawRoundedBarPath(
                x,
                y,
                barWidth - 20,
                barHeight,
                radius,
                actual < 0,
                fillColor
            );

            /* TARGET MARKER */
            if (target != null && target !== 0) {
                const targetHeight =
                    (Math.abs(target) / maxAbsValue) * chartHeight;

                const targetY = zeroY - targetHeight;

                const marker = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "line"
                );

                marker.setAttribute("x1", x.toString());
                marker.setAttribute("x2", (x + barWidth - 20).toString());
                marker.setAttribute("y1", targetY.toString());
                marker.setAttribute("y2", targetY.toString());
                marker.setAttribute(
                    "stroke",
                    this.settings.targetMarker.color.value.value
                );
                marker.setAttribute(
                    "stroke-width",
                    this.settings.targetMarker.thickness.value.toString()
                );
                marker.setAttribute("pointer-events", "none");

                this.svg.appendChild(marker);
            }

            /* VALUE LABEL */
            const labelColor =
                this.settings.conditionalFormatting.applyToLabels.value
                    ? fillColor
                    : "#222";

            this.drawText(
                `${(actual / 1_000_000).toFixed(1)}M`,
                margin.left + i * barWidth + barWidth / 2,
                y - 6,
                "middle",
                labelColor
            );

            /* CATEGORY LABEL */
            const cat = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );
            cat.textContent = categories[i];
            cat.setAttribute(
                "transform",
                `translate(${margin.left + i * barWidth + barWidth / 2}, ${zeroY + 60}) rotate(-45)`
            );
            cat.setAttribute("text-anchor", "end");
            cat.setAttribute("font-size", "10px");
            this.svg.appendChild(cat);

            /* TOOLTIP (FULLY COMPLIANT) */
            const achievement =
                target && target !== 0 ? actual / target : null;

            const variance =
                target && target !== 0 ? actual - target : null;

            const variancePct =
                target && target !== 0 ? (actual - target) / target : null;

            const tooltipData: VisualTooltipDataItem[] = [
                { displayName: "Category", value: categories[i] },
                { displayName: "Actual Revenue", value: actual.toLocaleString() },
                {
                    displayName: "Target Revenue",
                    value: target != null ? target.toLocaleString() : "N/A"
                },
                {
                    displayName: "Achievement %",
                    value:
                        achievement != null
                            ? (achievement * 100).toFixed(1) + "%"
                            : "N/A"
                },
                {
                    displayName: "Variance",
                    value:
                        variance != null
                            ? variance.toLocaleString()
                            : "N/A"
                },
                {
                    displayName: "Variance %",
                    value:
                        variancePct != null
                            ? (variancePct * 100).toFixed(1) + "%"
                            : "N/A"
                }
            ];

            this.tooltipServiceWrapper.addTooltip(
                d3.select(barPath),
                () => tooltipData,
                () => null
            );

            /* CROSS-FILTERING */
            const selectionId = this.host
                .createSelectionIdBuilder()
                .withCategory(dataView.categorical.categories[0], i)
                .createSelectionId();

            barPath.addEventListener("click", () => {
                this.selectionManager.select(selectionId, false);
            });
        });
    }

    /* ===== HELPERS ===== */

    private getConditionalColor(
        actual: number,
        target?: number,
        colorHex?: string
    ): string {

        const cf = this.settings.conditionalFormatting;

        if (
            cf.mode.value.value === "field" &&
            colorHex &&
            /^#([0-9A-F]{3}){1,2}$/i.test(colorHex)
        ) {
            return colorHex;
        }

        if (target == null || target === 0) {
            return cf.naColor.value.value;
        }

        const achievement = actual / target;

        if (achievement < cf.threshold1.value) return "#D32F2F";
        if (achievement < cf.threshold2.value) return "#F9A825";
        return "#2E7D32";
    }

    private drawRoundedBarPath(
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
        isNegative: boolean,
        fill: string
    ): SVGPathElement {

        const r = Math.min(radius, width / 2, height / 2);
        let d: string;

        if (!isNegative) {
            d = `
                M ${x} ${y + r}
                A ${r} ${r} 0 0 1 ${x + r} ${y}
                L ${x + width - r} ${y}
                A ${r} ${r} 0 0 1 ${x + width} ${y + r}
                L ${x + width} ${y + height}
                L ${x} ${y + height}
                Z
            `;
        } else {
            d = `
                M ${x} ${y}
                L ${x + width} ${y}
                L ${x + width} ${y + height - r}
                A ${r} ${r} 0 0 1 ${x + width - r} ${y + height}
                L ${x + r} ${y + height}
                A ${r} ${r} 0 0 1 ${x} ${y + height - r}
                Z
            `;
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", fill);
        this.svg.appendChild(path);

        return path;
    }

    private drawLine(x1: number, y1: number, x2: number, y2: number) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1.toString());
        line.setAttribute("y1", y1.toString());
        line.setAttribute("x2", x2.toString());
        line.setAttribute("y2", y2.toString());
        line.setAttribute("stroke", "#999");
        this.svg.appendChild(line);
    }

    private drawText(
        text: string,
        x: number,
        y: number,
        anchor: string,
        color: string
    ) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.textContent = text;
        t.setAttribute("x", x.toString());
        t.setAttribute("y", y.toString());
        t.setAttribute("text-anchor", anchor);
        t.setAttribute("font-size", "10px");
        t.setAttribute("fill", color);
        this.svg.appendChild(t);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return formattingSettingsService.buildFormattingModel(this.settings);
    }
}
