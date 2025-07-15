import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import upload from "../assets/upload.svg";

interface HeaderComponentProps {
    currentPage: "productList" | "structPage";
    onButtonClick: () => void; // 버튼 클릭 시 실행할 함수
}

const HeaderComponent = ({ currentPage, onButtonClick }: HeaderComponentProps) => {
    const navigate = useNavigate();

    return (
        <Header>
            <Segment>
                <PageButton
                    active={currentPage === "productList"}
                    onClick={() => navigate("/product")}
                >
                    상품 목록
                </PageButton>
                <PageButton
                    active={currentPage === "structPage"}
                    onClick={() => navigate("/struct")}
                >
                    매장 구조
                </PageButton>
            </Segment>
            <CategoryAddButton onClick={onButtonClick}>
                {currentPage === "productList" && (
                    <>
                        <img src={upload} alt="add" />
                        <ButtonText>엑셀 업로드</ButtonText>
                    </>
                )}
                {currentPage === "structPage" && (
                    <ButtonText>저장</ButtonText>
                )}
            </CategoryAddButton>
        </Header>
    );
};

export default HeaderComponent;

const Header = styled.div`
    display: flex;
    padding: 18px;
    justify-content: space-between;
    align-items: center;
    align-self: stretch;
    
    border-bottom: 1px solid #1D1D21;
    background: #101012;
`;

const Segment = styled.div`
    display: flex;
    padding: 3.488px;
    align-items: flex-start;
    gap: 3.488px;
    border-radius: 10.465px;
    background: rgba(62, 62, 77, 0.1);
`;

const PageButton = styled.div<{ active: boolean }>`
    cursor: pointer;
    display: flex;
    padding: 8.721px 13.953px;
    justify-content: center;
    align-items: center;
    gap: 8.721px;

    border-radius: 6.977px;
    background: ${({ active }) =>
            active ? "rgba(237, 237, 247, 0.04)" : "transparent"};

    color: ${({ active }) => (active ? "#FFFFFF" : "rgba(255, 255, 255, 0.50)")};
    text-align: center;
    font-variant-numeric: lining-nums tabular-nums;
    font-family: "Pretendard JP";
    font-size: 13.953px;
    font-style: normal;
    font-weight: ${({ active }) => (active ? 500 : 400)};
    line-height: 20.93px; /* 150% */
    letter-spacing: 0.08px;
`;

const CategoryAddButton = styled.div`
    cursor: pointer;
    display: flex;
    min-width: 45.348px;
    padding: 12.209px;
    justify-content: center;
    align-items: center;
    gap: 5.232px;
    border-radius: 10.465px;
    opacity: var(--Opacity, 1);
    background: #2e6be5;
`;

const ButtonText = styled.span`
    color: #EDEDF7;
    text-align: center;
    font-variant-numeric: lining-nums tabular-nums;
    font-size: 13.953px;
    font-style: normal;
    font-weight: 500;
    line-height: 20.93px; /* 150% */
    letter-spacing: 0.08px;
`;
