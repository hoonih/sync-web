import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import HeaderComponent from "../components/HeaderComponent.tsx";
import arrowdown from "../assets/arrowdown.svg"

interface CanvasObject {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'shelf' | 'code';
    selected: boolean;
    category?: string;
}

interface ResizeHandle {
    type: 'corner' | 'edge';
    position: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w';
    cursor: string;
}

interface ViewportState {
    x: number;
    y: number;
    zoom: number;
}

const StructurePage = () => {
    const [objects, setObjects] = useState<CanvasObject[]>([]);
    const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, zoom: 1 });
    const canvasRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [draggedObject, setDraggedObject] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [resizing, setResizing] = useState<{ objectId: string; handle: string; startBounds: CanvasObject } | null>(null);
    const [middleCategories, setMiddleCategories] = useState<string[]>([]);
    const [showDropdownFor, setShowDropdownFor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const GRID_SIZE = 80;

    // 초기 로드 시 저장된 매장 구조 불러오기
    useEffect(() => {
        loadStoreLayout();
    }, []);

    const loadStoreLayout = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("https://store-api.hoonih.com/load-store-layout/");
            const data = await response.json();

            if (data.objects) {
                setObjects(data.objects);
                console.log("매장 구조 로드 완료:", data.objects);
            }
        } catch (error) {
            console.error("매장 구조 로드 실패:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveStoreLayout = async () => {
        try {
            const response = await fetch("https://store-api.hoonih.com/save-store-layout/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    objects: objects.map(obj => ({
                        id: obj.id,
                        x: obj.x,
                        y: obj.y,
                        width: obj.width,
                        height: obj.height,
                        type: obj.type,
                        category: obj.category || null
                    }))
                }),
            });

            const result = await response.json();
            if (result.status === "success") {
                alert("매장 구조가 저장되었습니다!");
                console.log("저장 성공:", result.message);
            } else {
                alert("저장 실패: " + result.message);
            }
        } catch (error) {
            console.error("저장 실패:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    const fetchMiddleCategories = async () => {
        try {
            const res = await fetch("https://store-api.hoonih.com/products/");
            const json = await res.json();
            const unique = Array.from(new Set(json.map((item: any) => item["중분류"])));
            setMiddleCategories(unique);
        } catch (error) {
            console.error("카테고리 로드 실패:", error);
        }
    };

    const handleCategoryClick = async (objectId: string) => {
        if (showDropdownFor !== objectId) {
            await fetchMiddleCategories();
        }
        setShowDropdownFor(prev => prev === objectId ? null : objectId);
    };

    const snapPosition = (value: number): number => {
        return snapToGrid ? Math.round(value / GRID_SIZE) * GRID_SIZE : value;
    };

    const resizeHandles: ResizeHandle[] = [
        { type: 'corner', position: 'nw', cursor: 'nw-resize' },
        { type: 'corner', position: 'ne', cursor: 'ne-resize' },
        { type: 'corner', position: 'sw', cursor: 'sw-resize' },
        { type: 'corner', position: 'se', cursor: 'se-resize' },
        { type: 'edge', position: 'n', cursor: 'n-resize' },
        { type: 'edge', position: 'e', cursor: 'e-resize' },
        { type: 'edge', position: 's', cursor: 's-resize' },
        { type: 'edge', position: 'w', cursor: 'w-resize' },
    ];

    const screenToCanvas = useCallback((screenX: number, screenY: number) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };

        return {
            x: (screenX - rect.left - viewport.x) / viewport.zoom,
            y: (screenY - rect.top - viewport.y) / viewport.zoom
        };
    }, [viewport]);

    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;

        const canvasPos = screenToCanvas(e.clientX, e.clientY);

        const selectedShelf = objects.find(obj => obj.selected && obj.type === 'shelf');
        if (selectedShelf) {
            const handleSize = 8 / viewport.zoom;

            for (const handle of resizeHandles) {
                const handlePos = getHandlePosition(selectedShelf, handle.position, handleSize);
                if (canvasPos.x >= handlePos.x && canvasPos.x <= handlePos.x + handleSize &&
                    canvasPos.y >= handlePos.y && canvasPos.y <= handlePos.y + handleSize) {

                    setResizing({
                        objectId: selectedShelf.id,
                        handle: handle.position,
                        startBounds: { ...selectedShelf }
                    });
                    return;
                }
            }
        }

        const clickedObject = objects.find(obj =>
            canvasPos.x >= obj.x &&
            canvasPos.x <= obj.x + obj.width &&
            canvasPos.y >= obj.y &&
            canvasPos.y <= obj.y + obj.height
        );

        if (clickedObject) {
            setObjects(prev => prev.map(obj => ({
                ...obj,
                selected: obj.id === clickedObject.id
            })));

            setDraggedObject(clickedObject.id);
            setDragOffset({
                x: canvasPos.x - clickedObject.x,
                y: canvasPos.y - clickedObject.y
            });
        } else {
            setObjects(prev => prev.map(obj => ({ ...obj, selected: false })));
            setIsDragging(true);
            setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
        }
    }, [objects, screenToCanvas, viewport, resizeHandles]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (resizing) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            const { startBounds, handle } = resizing;

            let newBounds = { ...startBounds };
            const minSize = 20;

            switch (handle) {
                case 'nw':
                    newBounds.width = Math.max(minSize, startBounds.width + (startBounds.x - canvasPos.x));
                    newBounds.height = Math.max(minSize, startBounds.height + (startBounds.y - canvasPos.y));
                    newBounds.x = startBounds.x + startBounds.width - newBounds.width;
                    newBounds.y = startBounds.y + startBounds.height - newBounds.height;
                    break;
                case 'ne':
                    newBounds.width = Math.max(minSize, canvasPos.x - startBounds.x);
                    newBounds.height = Math.max(minSize, startBounds.height + (startBounds.y - canvasPos.y));
                    newBounds.y = startBounds.y + startBounds.height - newBounds.height;
                    break;
                case 'sw':
                    newBounds.width = Math.max(minSize, startBounds.width + (startBounds.x - canvasPos.x));
                    newBounds.height = Math.max(minSize, canvasPos.y - startBounds.y);
                    newBounds.x = startBounds.x + startBounds.width - newBounds.width;
                    break;
                case 'se':
                    newBounds.width = Math.max(minSize, canvasPos.x - startBounds.x);
                    newBounds.height = Math.max(minSize, canvasPos.y - startBounds.y);
                    break;
                case 'n':
                    newBounds.height = Math.max(minSize, startBounds.height + (startBounds.y - canvasPos.y));
                    newBounds.y = startBounds.y + startBounds.height - newBounds.height;
                    break;
                case 'e':
                    newBounds.width = Math.max(minSize, canvasPos.x - startBounds.x);
                    break;
                case 's':
                    newBounds.height = Math.max(minSize, canvasPos.y - startBounds.y);
                    break;
                case 'w':
                    newBounds.width = Math.max(minSize, startBounds.width + (startBounds.x - canvasPos.x));
                    newBounds.x = startBounds.x + startBounds.width - newBounds.width;
                    break;
            }

            newBounds.x = snapPosition(newBounds.x);
            newBounds.y = snapPosition(newBounds.y);
            newBounds.width = snapPosition(newBounds.width);
            newBounds.height = snapPosition(newBounds.height);

            setObjects(prev => prev.map(obj =>
                obj.id === resizing.objectId ? { ...obj, ...newBounds } : obj
            ));

        } else if (draggedObject) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            const newX = snapPosition(canvasPos.x - dragOffset.x);
            const newY = snapPosition(canvasPos.y - dragOffset.y);

            setObjects(prev => prev.map(obj =>
                obj.id === draggedObject
                    ? { ...obj, x: newX, y: newY }
                    : obj
            ));
        } else if (isDragging) {
            setViewport(prev => ({
                ...prev,
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            }));
        }
    }, [isDragging, dragStart, draggedObject, screenToCanvas, dragOffset, snapPosition, resizing]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setDraggedObject(null);
        setResizing(null);
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(3, viewport.zoom * delta));

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setViewport(prev => ({
            x: mouseX - (mouseX - prev.x) * (newZoom / prev.zoom),
            y: mouseY - (mouseY - prev.y) * (newZoom / prev.zoom),
            zoom: newZoom
        }));
    }, [viewport.zoom]);

    const addObject = useCallback((type: 'shelf' | 'code') => {
        const newObject: CanvasObject = {
            id: `${type}-${Date.now()}`,
            x: snapPosition(100 - viewport.x / viewport.zoom),
            y: snapPosition(100 - viewport.y / viewport.zoom),
            width: type === 'shelf' ? 180 : 40,
            height: type === 'shelf' ? 380 : 40,
            type,
            selected: false,
            category: undefined
        };

        setObjects(prev => [...prev, newObject]);
    }, [viewport, snapPosition]);

    const getHandlePosition = (obj: CanvasObject, position: string, handleSize: number) => {
        const { x, y, width, height } = obj;
        const halfHandle = handleSize / 2;

        switch (position) {
            case 'nw': return { x: x - halfHandle, y: y - halfHandle };
            case 'ne': return { x: x + width - halfHandle, y: y - halfHandle };
            case 'sw': return { x: x - halfHandle, y: y + height - halfHandle };
            case 'se': return { x: x + width - halfHandle, y: y + height - halfHandle };
            case 'n': return { x: x + width/2 - halfHandle, y: y - halfHandle };
            case 'e': return { x: x + width - halfHandle, y: y + height/2 - halfHandle };
            case 's': return { x: x + width/2 - halfHandle, y: y + height - halfHandle };
            case 'w': return { x: x - halfHandle, y: y + height/2 - halfHandle };
            default: return { x: 0, y: 0 };
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                setObjects(prev => prev.filter(obj => !obj.selected));
            }
            if (e.key === 'Shift') {
                setSnapToGrid(true);
            }
            if (e.key === 'g' || e.key === 'G') {
                setSnapToGrid(prev => !prev);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setSnapToGrid(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    if (isLoading) {
        return (
            <div style={{width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{color: '#EDEDF7', fontSize: '18px'}}>매장 구조 로드 중...</div>
            </div>
        );
    }

    return (
        <div style={{width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column'}}>
            <HeaderComponent
                currentPage={"structPage"}
                onButtonClick={saveStoreLayout}
            />
            <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'row'}}>
                <LeftContainer>
                    <CanvasWrapper
                        ref={canvasRef}
                        onMouseDown={handleCanvasMouseDown}
                        onWheel={handleWheel}
                    >
                        <CanvasContent
                            style={{
                                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
                            }}
                        >
                            <GridBackground>
                                <GridPattern
                                    style={{
                                        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                                        backgroundPosition: '0 0'
                                    }}
                                />
                            </GridBackground>

                            {objects.map(obj => (
                                <div key={obj.id}>
                                    <CanvasObjectElement
                                        style={{
                                            left: obj.x,
                                            top: obj.y,
                                            width: obj.width,
                                            height: obj.height
                                        }}
                                        $selected={obj.selected}
                                        $type={obj.type}
                                    >
                                        {obj.type === 'shelf' ? (
                                            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'start', height: '100%' }}>
                                                <ShelfListContainer onClick={() => handleCategoryClick(obj.id)}>
                                                    {obj.category || '카테고리'}
                                                    <img src={arrowdown} alt="arrow" />
                                                </ShelfListContainer>
                                                {showDropdownFor === obj.id && (
                                                    <Dropdown>
                                                        {middleCategories.map(cat => (
                                                            <DropdownItem key={cat} onClick={() => {
                                                                setObjects(prev => prev.map(o =>
                                                                    o.id === obj.id ? { ...o, category: cat } : o
                                                                ));
                                                                setShowDropdownFor(null);
                                                            }}>
                                                                {cat}
                                                            </DropdownItem>
                                                        ))}
                                                    </Dropdown>
                                                )}
                                            </div>
                                        ) : '코드'}
                                    </CanvasObjectElement>

                                    {obj.selected && obj.type === 'shelf' && resizeHandles.map(handle => {
                                        const handleSize = 8;
                                        const handlePos = getHandlePosition(obj, handle.position, handleSize);
                                        return (
                                            <ResizeHandle
                                                key={handle.position}
                                                style={{
                                                    left: handlePos.x,
                                                    top: handlePos.y,
                                                    width: handleSize,
                                                    height: handleSize,
                                                    cursor: handle.cursor
                                                }}
                                                $corner={handle.type === 'corner'}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </CanvasContent>
                    </CanvasWrapper>
                </LeftContainer>
                <RightContainer>
                    <Button onClick={() => addObject('shelf')}>
                        진열대 추가
                    </Button>
                    <Button onClick={() => addObject('code')}>
                        코드 추가
                    </Button>
                    <SnapToggleButton
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        $active={snapToGrid}
                    >
                        격자 스냅 {snapToGrid ? 'ON' : 'OFF'}
                    </SnapToggleButton>
                    <InfoContainer>
                        <ZoomInfo>줌: {Math.round(viewport.zoom * 100)}%</ZoomInfo>
                        <KeyboardHint>
                            <div>Shift: 임시 격자 스냅</div>
                            <div>G: 격자 스냅 토글</div>
                            <div>Del: 삭제</div>
                            <div style={{marginTop: '8px', fontSize: '9px', color: '#888'}}>
                                격자 1칸 = 1m (80px)
                            </div>
                        </KeyboardHint>
                    </InfoContainer>
                </RightContainer>
            </div>
        </div>
    );
};

// 스타일 컴포넌트들 (기존과 동일)
const Dropdown = styled.div`
    position: absolute;
    top: 60px;
    left: 0;
    background: #1D1D21;
    border: 1px solid #2E6BE5;
    border-radius: 8px;
    z-index: 100;
    width: 160px;
`;

const DropdownItem = styled.div`
    padding: 10px;
    cursor: pointer;
    color: #EDEDF7;
    &:hover {
        background-color: #2E6BE5;
    }
`;

const ResizeHandle = styled.div<{ $corner: boolean }>`
    position: absolute;
    background: #FFFFFF;
    border: 1px solid #2E6BE5;
    border-radius: ${props => props.$corner ? '50%' : '2px'};
    z-index: 10;
    pointer-events: auto;

    &:hover {
        background: #2563eb;
        transform: scale(1.2);
    }
`;

const CanvasWrapper = styled.div`
    width: 100%;
    height: 100%;
    cursor: grab;
    overflow: hidden;
    background: #0a0a0a;

    &:active {
        cursor: grabbing;
    }
`;

const CanvasContent = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    transform-origin: 0 0;
`;

const GridBackground = styled.div`
    position: absolute;
    top: -5000px;
    left: -5000px;
    width: 10000px;
    height: 10000px;
    pointer-events: none;
`;

const GridPattern = styled.div`
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
`;

const ShelfListContainer = styled.div`
    width: 100%;
    height: 52px;
    display: flex;
    padding: 14px;
    align-items: center;
    gap: 8px;
    align-self: stretch;
    border-radius: 12px;
    background: rgba(57, 57, 77, 0.20);
    justify-content: space-between;
    
    color: rgba(237, 237, 247, 0.50);
    font-variant-numeric: lining-nums tabular-nums;
    font-family: "Pretendard JP";
    font-size: 16px;
    font-style: normal;
    font-weight: 400;
    line-height: var(--Typescale-Body-Line-Height, 24px); /* 150% */
    letter-spacing: 0.091px;
`;

const CanvasObjectElement = styled.div<{ $selected: boolean; $type: 'shelf' | 'code' }>`
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.$type === 'shelf' ? '12px' : 0};
    border-radius: 12px;
    cursor: move;
    user-select: none;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.1s ease;

    background: ${props => props.$type === 'shelf'
    ? '#1D1D21'
    : 'white'
};

    border: 2px solid ${props => props.$selected
    ? (props.$type === 'shelf' ? '#2E6BE5' : 'grey')
    : 'transparent'
};

    color: ${props => props.$type === 'shelf' ? '#93c5fd' : 'black'};
`;

const SnapToggleButton = styled.div<{ $active: boolean }>`
    cursor: pointer;
    display: flex;
    min-width: 52px;
    padding: 14px;
    justify-content: center;
    align-items: center;
    align-self: stretch;
    border-radius: 12px;
    
    background: ${props => props.$active
    ? 'rgba(59, 130, 246, 0.3)'
    : 'rgba(57, 57, 77, 0.20)'
};
    
    border: 2px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
    
    color: ${props => props.$active ? '#93c5fd' : '#EDEDF7'};
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    letter-spacing: 0.091px;
    
    &:hover {
        background: ${props => props.$active
    ? 'rgba(59, 130, 246, 0.4)'
    : 'rgba(57, 57, 77, 0.30)'
};
    }
`;

const InfoContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
`;

const ZoomInfo = styled.div`
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 6px;
    color: #EDEDF7;
    font-size: 12px;
    text-align: center;
`;

const KeyboardHint = styled.div`
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 6px;
    color: #EDEDF7;
    font-size: 10px;
    
    div {
        margin-bottom: 2px;
        &:last-child {
            margin-bottom: 0;
        }
    }
`;

const LeftContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex: 1 0 0;
`;

const RightContainer = styled.div`
    display: flex;
    width: 350px;
    padding: 20px;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    align-self: stretch;

    border-left: 1px solid #1D1D21;
    background: #101012;
`;

const Button = styled.div`
    cursor: pointer;

    display: flex;
    min-width: 52px;
    padding: 14px var(--Gap-14, 14px);
    justify-content: center;
    align-items: flex-start;
    align-self: stretch;

    border-radius: 12px;
    opacity: var(--Opacity, 1);
    background: rgba(57, 57, 77, 0.20);

    color: #EDEDF7;
    text-align: center;
    font-variant-numeric: lining-nums tabular-nums;
    font-size: var(--Typescale-Body-Size, 16px);
    font-style: normal;
    font-weight: 500;
    line-height: var(--Typescale-Body-Line-Height, 24px); /* 150% */
    letter-spacing: 0.091px;

    &:hover {
        background: rgba(57, 57, 77, 0.30);
    }
`;

export default StructurePage;