import styled from "styled-components";
import HeaderComponent from "../components/HeaderComponent.tsx";
import * as XLSX from "xlsx";
import {useEffect, useRef, useState} from "react";

const ProductPage = () => {
    const [products, setProducts] = useState<Array<any>>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("전체");



    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch("https://store-api.hoonih.com/products/");
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error("초기 데이터 불러오기 실패:", error);
            }
        };

        fetchProducts();
    }, []);

    const uniqueCategories = ["전체", ...Array.from(
        new Set(products.map((item) => item.중분류).filter(Boolean))
    )];

    const overwriteToServer = async (data: any[]) => {
        try {
            const response = await fetch("https://store-api.hoonih.com/overwrite-products/", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            alert(`업로드 성공: 총 ${result.count}건 덮어씌움`);
        } catch (error) {
            console.error("업로드 실패:", error);
            alert("업로드 실패");
        }
    };



    const filteredProducts = selectedCategory === "전체"
        ? products
        : products.filter((item) => item.중분류 === selectedCategory);


    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // 대분류, 중분류, 소분류, 품목명만 추출
            const filtered = jsonData.map((row: any) => ({
                대분류: row["대분류"],
                중분류: row["중분류"],
                소분류: row["소분류"],
                품목명: row["품목명"],
            }));

            setProducts(filtered); // 테이블에 넣기
            overwriteToServer(filtered); // 서버 저장용
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <>
            <HeaderComponent
                currentPage={"productList"}
                onButtonClick={() => fileInputRef.current?.click()}
            />
            <input
                type="file"
                accept=".xlsx, .xls"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={handleExcelUpload}
            />
            <Container>
                <div style={{ display: "flex", gap: 12 }}>
                {uniqueCategories.map((category) => (
                    <CategoryButton
                        key={category}
                        active={selectedCategory === category}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
                    </CategoryButton>
                ))}
            </div>

                <Table>
                    <TableHeadContainer>
                        <TableHeadProductName>상품명</TableHeadProductName>
                        <TableHeadLabel>세분류</TableHeadLabel>
                        <TableHeadLabel>중분류</TableHeadLabel>
                        <TableHeadLabel>소분류</TableHeadLabel>
                        <TableHeadLabel>추가일</TableHeadLabel>
                    </TableHeadContainer>
                    {filteredProducts.map((item, idx) => (
                        <TableContentContainer key={idx}>
                            <TableContentProductName>{item.품목명}</TableContentProductName>
                            <TableContentLabel>{item.대분류}</TableContentLabel>
                            <TableContentLabel>{item.중분류}</TableContentLabel>
                            <TableContentLabel>{item.소분류}</TableContentLabel>
                            <TableContentLabel>25.07.14</TableContentLabel> {/* 더미 날짜 */}
                        </TableContentContainer>
                    ))}


                </Table>
            </Container>
        </>
    );
}

const TableContentLabel = styled.div`
    display: flex;
    height: var(--Table-Height-Height, 60px);
    min-width: 160px;
    min-height: var(--Table-Height-Height, 60px);
    max-height: var(--Table-Height-Height, 60px);
    padding: var(--Gap-10, 10px) 20px;
    align-items: center;
    gap: var(--Gap-8, 8px);
    border-bottom: 1px solid #1D1D21;

    color: #EDEDF7;
    font-variant-numeric: lining-nums tabular-nums;
    font-family: "Pretendard JP";
    font-size: 16px;
    font-style: normal;
    font-weight: 400;
    line-height: 24px; /* 150% */
    letter-spacing: -0.368px;
`
const TableContentProductName = styled.div`
    display: flex;
    flex: 1 0 0;
    height: 60px;
    padding: 10px 20px;
    align-items: center;
    gap: 8px;

    color: #EDEDF7;
    font-variant-numeric: lining-nums tabular-nums;
    font-family: "Pretendard JP";
    font-size: 16px;
    font-style: normal;
    font-weight: 400;
    line-height: 24px; /* 150% */
    letter-spacing: -0.368px;
`
const TableContentContainer = styled.div`
    display: flex;
    align-items: flex-start;
    align-self: stretch;
    border-bottom: 1px solid #1D1D21;
`


const TableHeadLabel = styled.div`
    display: flex;
    min-width: 160px;
    padding: var(--Gap-12, 12px) 20px;
    align-items: center;
    gap: var(--Gap-8, 8px);
    border-bottom: 1px solid #1D1D21;
    color: rgba(237, 237, 247, 0.60);
    font-variant-numeric: lining-nums tabular-nums;
    font-family: "Pretendard JP";
    font-size: 14px;
    font-style: normal;
    font-weight: 500;
    line-height: 20px; /* 142.857% */
    letter-spacing: 0.353px;
`
const TableHeadProductName = styled.div`
    display: flex;
    padding: var(--Gap-12, 12px) 20px;
    align-items: center;
    gap: var(--Gap-8, 8px);
    flex: 1 0 0;
    border-bottom: 1px solid #1D1D21;
    color: rgba(237, 237, 247, 0.60);
    font-variant-numeric: lining-nums tabular-nums;
    font-size: 14px;
    font-style: normal;
    font-weight: 500;
    line-height: 20px; /* 142.857% */
    letter-spacing: 0.353px;
`
const Table = styled.div`
    display: flex;
    max-height: 796px;
    flex-direction: column;
    align-items: flex-start;
    align-self: stretch;

    border-radius: var(--Radius-8, 8px);
    border: 1px solid #1D1D21;
`
const TableHeadContainer = styled.div`
    display: flex;
    align-items: flex-start;
    align-self: stretch;
    background: #101012;
`
const Container = styled.div`
    display: flex;
    padding: 20px 28px;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    gap: 20px;
    align-self: stretch;
`

const CategoryButton = styled.div<{active: boolean}>`
    display: flex;
    cursor: pointer;
    padding: 10px 16px;
    justify-content: center;
    align-items: center;
    gap: 10px;
    border-radius: 8px;
    background: ${({ active }) => (active ? "#EDEDF7" : "rgba(62, 62, 77, 0.15)")};
    color: ${({ active }) => (active ? "#101012" : "rgba(237, 237, 247, 0.50)")};;
    text-align: center;
    font-variant-numeric: lining-nums tabular-nums;
    font-family: "Pretendard JP";
    font-size: 16px;
    font-style: normal;
    font-weight: ${({ active }) => (active ? 500 : 400)};;
    line-height: 24px; /* 150% */
    letter-spacing: 0.091px;
`

export default ProductPage;
