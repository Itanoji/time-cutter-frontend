import React, {useRef, useEffect, useContext, useState} from 'react';
import { SVG } from '@svgdotjs/svg.js';
import { ReactSVG } from 'react-svg';
import {CurrentItemContext} from "../../DiagramProperties/CurrentItemContext";
import diagramContext, {DiagramContext} from "../../DiagramProperties/DiagramContext";
import {next} from "lodash/seq";


const DiagramRenderer = () => {
    const containerRef = useRef();
    const {currentItem, updateCurrentItem} = useContext(CurrentItemContext);
    const {diagram, updateSignal, updateDiagram} = useContext(DiagramContext);
    const [selected, setSelected] = useState(null) // Множество для хранения выделенных элементов
    let isCtrlPressed = false;
    let isShiftPressed = false;
    let isLineDragged = false;
    let draggedLineIndex = null;
    let offsetX = 0;


    /**
     * Перерисовка диаграммы при её изменении
     */
    useEffect(() => {
        if (containerRef.current) {
            const container = containerRef.current;
            // Получаем текущую ширину контейнера
            const containerWidth = container.clientWidth;

            // Устанавливаем ширину контейнера на основе текущей ширины
            container.style.width = `${containerWidth}px`;
            clearContainer(containerRef.current)
            drawDiagram(containerRef.current, diagram, updateCurrentItem, updateSignal);
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);
        }
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        }
    }, [containerRef, diagram, currentItem, updateSignal, selected]);


    /**
     * Очистка контейнера от диаграммы
     * @param container
     */
    const clearContainer = (container) => {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    };

    /**
     * Поиск наибольшего размера имени сигнала для корректной отрисовки
     * @param signals - сигналы
     * @returns {number} - длина максимального имени
     */
    const findLongestSignalName = (signals) => {
        let maxLength = 0;

        signals.forEach((signal) => {
            if (signal.name.length > maxLength) {
                maxLength = signal.name.length;
            }
        });

        return maxLength;
    };

    /**
     * Cоздать элемент стрелки
     * @param svg
     * @returns {svg объект стрелки}
     */
    const createArrow = (svg) => {
        const arrowSize = 10; //размер стрелки
        return svg
            .marker(arrowSize, arrowSize, function (add) {
                add
                    .path(`M0,0 L${arrowSize},${arrowSize / 2} L0,${arrowSize} L${arrowSize / 4},${arrowSize / 2} Z`)
                    .fill('black');
                this.ref(arrowSize, arrowSize / 2);
            })
            .attr({ orient: 'auto' });
    }

    const selectedAreaStyle = {color: '#2db9e3', opacity: 0.1};

    function onKeyDown(event) {
        if (event.key === 'Control') {
            isCtrlPressed = true;
        } else if (event.key === 'Shift') {
            isShiftPressed = true;
        } else if (event.key === 'Escape' || event.keyCode === 27) {
           setSelected(null);
           updateCurrentItem({
               type: 'diagram'
           })
        }
    }

    function onKeyUp(event) {
        if (event.key === 'Control') {
            isCtrlPressed = false;
        } else if (event.key === 'Shift') {
            isShiftPressed = false;
        }
    }

    const drawDiagram = (container, diagram, updateCurrentItem, updateSignal) => {
        //Если сигналов нет - ничего не рисуем
        if(diagram.signals.length === 0) {
            return;
        }

        if(currentItem != null && currentItem.type !== 'areas' && currentItem.type !=='busAreas') {
            setSelected(null);
        }

        //Свойства диаграммы
        const { totalTime, stepTime, unit, showGrid, showAxes, signals, tracers } = diagram;

        //Объявляем базовые настройки для отрисовки диаграмм

        const startPaddingX = findLongestSignalName(signals) * 7 + 20; //Откуда начинать рисовать диаграмму
        const startPaddingY = 20;
        const signalPadding = 15; //Расстояние между сигналами
        const stepCount = totalTime/stepTime; //Количество шагов, отображаемых на диаграмме
        const stepWidth = 50; //Размер одного шага
        const signalHeight = 25; //Высота сигнала
        const diagramWidth = stepWidth*stepCount + startPaddingX; //Ширина холста = ширина шага*кол-во шагов + отступ диаграммы
        const diagramHeight = signals.length * (signalHeight + signalPadding + 1) + startPaddingY; //Высота холста

        const xWithPadding = (x) => startPaddingX + x; //Координата x с учётом отступа

        //Создаём контейнер
        const svg = SVG().addTo(container).size(diagramWidth, diagramHeight+100);
        svg.clear();

        //Создаём невидимую область, окружающую весь холст
        svg.rect(diagramWidth+100, diagramHeight+100).fill('transparent').move(0, 0)
            .on('click', () => {
                updateCurrentItem({
                    type: 'diagram'
                })
            });

        // Создаем маркер (стрелку) с заданными размерами и цветом
        const arrow = createArrow(svg);

        //Отрисовка сетки
        if (showGrid) {
            const stepCount = totalTime / stepTime;
            for (let i = 1; i <= stepCount; i++) {
                const x = i * stepWidth + startPaddingX;
                svg.line(x, 0, x, diagramHeight).stroke({ color: '#ccc', width: 1, dasharray: '5,5' });
            }
        }

        //Отрисовка осей
        if (showAxes) {
            svg
                .line(startPaddingX, diagramHeight, startPaddingX, 0)
                .stroke({ color: 'black', width: 1 })
                .attr({ 'marker-end': arrow }); // Добавляем маркер (стрелку) к концу линии;
            svg
                .line(startPaddingX, diagramHeight, diagramWidth, diagramHeight)
                .stroke({ color: 'black', width: 1 })
                .attr({ 'marker-end': arrow }); // Добавляем маркер (стрелку) к концу линии
        }

        //Отрисовка трассеров
        tracers.forEach((tracer, index) => {
            const tracerLine = svg.line(tracer.x,0,tracer.x, diagramHeight+1)
                .stroke({color: 'green', width: 1});
            const tracerEdit = svg.line(tracer.x, 0, tracer.x,diagramHeight+1)
                .stroke({ color: 'transparent', width: 6 })
                .attr({'cursor' : 'ew-resize'})
                .on('mousedown', (e) => {
                    isLineDragged = true;
                    draggedLineIndex = index;
                    offsetX = e.clientX - parseFloat(tracerEdit.attr("x1"));
                    svg.on('mousemove', (e) => {
                        if(isLineDragged && draggedLineIndex === index) {
                            const newX = e.clientX - offsetX;
                            tracerLine.attr("x1", newX);
                            tracerLine.attr("x2", newX);
                            tracerEdit.attr("x1", newX);
                            tracerEdit.attr("x2", newX);
                        }
                    })
                        .on('mouseup', () => {
                            if(isLineDragged && draggedLineIndex === index) {
                                const newTracers = tracers;
                                newTracers[index].x = tracerLine.attr("x1");
                                updateDiagram({
                                    tracers: newTracers
                                })
                            }
                            svg.on('mouseup', () => {});
                            svg.on('mousemove', () => {});
                            draggedLineIndex = null;
                            isLineDragged = false;
                        })
                })

        })

        /**
         * Отрисовка сигналов
         */
            //Отрисовка сигнальной линии
        const drawAreaLine = (x1,y1, x2,y2) => {
                svg.line(x1, y1, x2, y2).stroke({ color: 'blue', width: 2 });
            };

        signals.forEach((signal, index) => {
            const { name, type, areas } = signal;
            //Начальная координата по y = номер сигнала * размер сигнала + отступ
            const y = index * signalHeight+(signalPadding*(index+1)) + startPaddingY;
            switch (type) {
                case 'bit':
                {
                    //Отрисовка битового сигнала
                    areas.forEach((area, areaIndex) => {
                        const {value, padding} = area;
                        const startX = xWithPadding(areaIndex * stepWidth + padding);
                        const endX = xWithPadding((areaIndex + 1) * stepWidth);
                        if (areaIndex > 0 && areas[areaIndex-1].value !== value) {
                            const prevValue = areas[areaIndex - 1].value;
                            if(prevValue < value) {
                                drawAreaLine(startX, y+signalHeight, startX+8, y);
                                drawAreaLine(startX+8, y, endX, y);
                            } else {
                                drawAreaLine(startX, y, startX+8, y+signalHeight);
                                drawAreaLine(startX+8, y+signalHeight, endX, y+signalHeight);
                            }

                        } else {
                            if (value === '1') {
                                drawAreaLine(startX, y, endX, y);
                            } else if(value === '0') {
                                drawAreaLine(startX, y + signalHeight, endX, y + signalHeight)
                            }
                        }
                        //Дорисовываем хвостик от пред сигнала если надо
                        if(areaIndex > 0 && padding !== 0) {
                            const prevValue = areas[areaIndex - 1].value;
                            if(prevValue === '1') {
                                drawAreaLine(startX-padding, y, startX, y);
                            } else {
                                drawAreaLine(startX-padding, y+signalHeight, startX, y+signalHeight);
                            }
                        }
                    })
                    break;
                }
                case 'clk':
                {
                    //Отрисовка тактового сигнала
                    areas.forEach((area, areaIndex) => {
                        const {value, padding} = area;
                        const startX = xWithPadding(areaIndex * stepWidth+padding);
                        const endX = xWithPadding((areaIndex + 1) * stepWidth);
                        if (value === '1') {
                            drawAreaLine(startX, y, endX, y);
                        } else if(value === '0') {
                            drawAreaLine(startX, y+signalHeight, endX, y+signalHeight);
                        }
                        //Рисуем фронт/спад, если нужно
                        if (areaIndex > 0) {
                            const prevValue = areas[areaIndex - 1].value;
                            if (prevValue !== value) {
                                drawAreaLine(startX, y, startX, y + signalHeight);
                            }
                        }
                        //Дорисовываем хвостик от пред сигнала если надо
                        if(areaIndex > 0 && padding !== 0) {
                            const prevValue = areas[areaIndex - 1].value;
                            if(prevValue === '1') {
                                drawAreaLine(startX-padding, y, startX, y);
                            } else {
                                drawAreaLine(startX-padding, y+signalHeight, startX, y+signalHeight);
                            }
                        }
                    })
                    break;
                }
                case 'bus':
                {
                    let currentStep = 0;
                    areas.forEach((area, areaIndex) => {
                        const {value, steps, padding} = area;
                        //Добавляем в конец, если в след элементе есть задержка
                        let nextAreaPadding = 0;
                        if(areas.length - 1 > areaIndex && areas[areaIndex+1].padding > 0) {
                            nextAreaPadding = areas[areaIndex+1].padding;
                        }
                        const startX = xWithPadding(currentStep * stepWidth + area.padding);
                        const endX = xWithPadding(currentStep*stepWidth + area.steps*stepWidth + nextAreaPadding);
                        if (areaIndex > 0) {
                            drawAreaLine(startX,y, startX + 8, y + signalHeight);
                            drawAreaLine(startX,y+signalHeight, startX + 8, y);
                            drawAreaLine(startX+8, y, endX, y);
                            drawAreaLine(startX+8, y+signalHeight, endX, y+signalHeight);
                        } else {
                            drawAreaLine(startX, y, endX, y);
                            drawAreaLine(startX, y+signalHeight, endX, y+signalHeight);
                        }
                        svg.text(area.value)
                            .font({ family: 'Arial', size: 15, anchor: 'middle', weight: "bold"})
                            .fill("black")
                            .move((endX+startX)/2, y+signalHeight/2-15)
                            .attr({ 'text-anchor': 'end', 'dominant-baseline': 'central'});
                        currentStep+=Number(area.steps);

                        //Дорисовываем хвостик предыдущего сигнала если есть padding
                        // if(area.padding !== 0) {
                        //     drawAreaLine(startX-padding, y, startX, y);
                        //     drawAreaLine(startX-padding, y+signalHeight, startX, y+signalHeight);
                        // }
                    })
                    break;
                }
            }

            // Добавить название сигнала слева от сигнала
            const signalNameText = svg
                .text(name)
                .font({ family: 'Arial', size: 16, anchor: 'start', weight: "bold"})
                .fill("green")
                .move(startPaddingX-3, y+signalHeight/2-14)
                .attr({ 'text-anchor': 'end', 'dominant-baseline': 'central', 'cursor': 'pointer' });
            const underline = svg
                .line(startPaddingX-3, y+signalHeight/2+9, startPaddingX - name.length*10, y+signalHeight/2+9)
                .stroke({ width: 2, dasharray: "2,2", color: "black" });
            underline.hide();

            // Показываем пунктирное подчеркивание при наведении курсора мыши
            signalNameText.on("mouseenter", function () {
                underline.show();
            });

            // Скрываем пунктирное подчеркивание при выходе курсора мыши
            signalNameText.on("mouseleave", function () {
                underline.hide();
            });

            // Выбранный сигнал становится активным
            signalNameText.on("click", function () {
                updateCurrentItem({
                    type: 'signal',
                    index: index
                })
                setSelected(null);
            });
        });

        /**
         * Отрисовка редактирорования
         */
        const drawEditLine = (x1,y,x2,) => {
            const lineStyleDefault = {color: '#000', width: 1, opacity: 0.1}
            const lineStyleActive = {color: 'black', width: 2, opacity: 1};
            const line = svg.line(x1,y,x2,y)
                .stroke(lineStyleDefault);
            const clickableLine = svg.line(x1, y-2, x2, y-2)
                .stroke({color: 'transparent', width: 4})
                .on('mouseover', () => {
                    line.stroke(lineStyleActive)
                })
                .on('mouseout', () => {
                    line.stroke(lineStyleDefault)
                });
            return clickableLine;
        }

        signals.forEach((signal, index) => {
            const { type, areas } = signal;

            let currentStep = 0;

            const y = index * signalHeight+(signalPadding*(index+1)) + startPaddingY;

            //Добавляем доп элемент в конец, чтоб его можно было редактировать, если это не шина
            let tempAreas;
            if(type === 'bus') {
                tempAreas = areas;
            } else {
                tempAreas = [...areas, null];
            }

            tempAreas.forEach((area, areaIndex) => {
                let startX;
                let endX;
                if(type === 'bus' && area !== null) {
                    startX = xWithPadding(currentStep * stepWidth);
                    endX = xWithPadding(currentStep*stepWidth + area.steps*stepWidth);
                } else {
                    startX = xWithPadding(areaIndex * stepWidth);
                    endX = xWithPadding((areaIndex + 1) * stepWidth);
                }

                //Отрисовка клеток для выделения
                if(areaIndex !== tempAreas.length-1 || type === 'bus') {
                    const rect = svg.rect(endX - startX, signalHeight).fill('transparent').move(startX, y);
                    rect.on('contextmenu', (event) => {
                        event.preventDefault();
                    })
                        .on('click', () => {
                            //Если событие произошло при том же сигнале
                            let newSelected = selected;
                            if(newSelected != null && newSelected.signalIndex === index) {
                                if(isCtrlPressed) {
                                    if(newSelected.selectedAreas.includes(areaIndex)) {
                                        const indexDelete = newSelected.selectedAreas.indexOf(areaIndex);
                                        newSelected.selectedAreas.splice(indexDelete,1);
                                    } else {
                                        newSelected.selectedAreas.push(areaIndex);
                                    }
                                } else if(isShiftPressed) {
                                    let prevIndex = newSelected.selectedAreas[newSelected.selectedAreas.length-1];
                                    while(prevIndex > areaIndex) {
                                        prevIndex -=1;
                                        newSelected.selectedAreas.push(prevIndex);
                                    }
                                    while (prevIndex < areaIndex) {
                                        prevIndex+=1;
                                        newSelected.selectedAreas.push(prevIndex);
                                    }
                                } else {
                                    let selectedAreas = [];
                                    selectedAreas.push(areaIndex);
                                    newSelected = {
                                        signalIndex: index,
                                        selectedAreas: selectedAreas
                                    }
                                    setSelected({
                                        signalIndex: index,
                                        selectedAreas: selectedAreas
                                    });
                                }

                            } else {
                                let selectedAreas = [];
                                selectedAreas.push(areaIndex);
                                newSelected = {
                                    signalIndex: index,
                                    selectedAreas: selectedAreas
                                }
                                setSelected({
                                    signalIndex: index,
                                    selectedAreas: selectedAreas
                                });
                            }
                            if(type === 'bus' && area != null) {
                                updateCurrentItem({
                                    index: index,
                                    type: 'busAreas',
                                    areas: newSelected.selectedAreas
                                })
                            } else {
                                updateCurrentItem({
                                    index: index,
                                    type: 'areas',
                                    areas: newSelected.selectedAreas
                                })
                            }
                        })
                        .on('contextmenu', (event) => {
                            event.preventDefault();
                            if(areaIndex === areas.length - 1) {
                                const updatedArea = areas;
                                updatedArea.pop();
                                updateSignal(index, {
                                    areas: updatedArea
                                })
                            }
                        })
                        .attr({ 'cursor': 'pointer'});

                    if(selected != null && selected.signalIndex === index && selected.selectedAreas.includes(areaIndex)) {
                        rect.fill(selectedAreaStyle);
                    }
                }

                //Линии редактирования рисуем для обычных сигналов
                if(type !== 'bus') {
                    //Верхняя линия
                    const upLine = drawEditLine(startX, y, endX);
                    upLine.on('click', () => {
                        if(areaIndex >= areas.length) {
                            const newAreas = [...areas, {
                                value: '1',
                                padding: 0
                            }];
                            updateSignal(index, {
                                areas: newAreas
                            });
                        } else {
                            areas[areaIndex].value = '1';
                            updateSignal(index, {
                                areas: areas
                            })
                        }
                    });

                    //Нижняя линия
                    const downLine = drawEditLine(startX, y+signalHeight, endX)
                    downLine.on('click', () => {
                        if(areaIndex >= areas.length) {
                            const newAreas = [...areas, {
                                value: '0',
                                padding: 0
                            }];
                            updateSignal(index, {
                                areas: newAreas
                            });
                        } else {
                            areas[areaIndex].value = '0';
                            updateSignal(index, {
                                areas: areas
                            });
                        }
                    });
                }


                // const midLine = svg.line(startX, (2*y + signalHeight)/2, endX, (2*y + signalHeight)/2)
                //     .stroke({color: '#000', width: 1, opacity: 0.1});
                // svg.line(startX, (2*y + signalHeight)/2 -2, endX, (2*y + signalHeight)/2 - 2)
                //     .stroke({ color: 'transparent', width: 4 })
                //     .on('mouseover', () => {
                //         midLine.stroke({color: 'black', width: 2, opacity: 1})
                //     })
                //     .on('mouseout', () => {
                //         midLine.stroke({color: '#000', width: 1, opacity: 0.1})
                //     });
                if(type === 'bus' && area !== null) {
                    currentStep += Number(area.steps)
                }
            });

        });

    };


    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative', padding: '10px' }}>
            <ReactSVG src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3C/svg%3E" />
        </div>
    );
};


export default DiagramRenderer;

