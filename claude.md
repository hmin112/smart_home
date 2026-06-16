# Claude 입력용 보고서 생성 프롬프트

> **사용 방법:** 아래 내용을 전체 복사하여 클로드(Claude)에 입력하세요. 
> `[여기에 아두이노 코드 1을 붙여넣으세요]`와 같은 표시가 된 부분에 실제 소스 코드를 붙여넣기만 하면 됩니다.

---

당신은 IoT 및 임베디드 시스템 전문가입니다. 아래 제공된 프로젝트 기술 명세와 실제 구현 코드를 바탕으로 'IoT 스마트홈 시스템 최종 보고서'를 작성해 주세요. 

교수님께 제출할 최종 결과물이므로 매우 전문적이고 논리적인 어조로 작성해야 하며, 특히 하드웨어 구성과 소프트웨어 아키텍처 부분은 제공된 실제 데이터와 일치해야 합니다.

### [프로젝트 주요 기술 정보]

1. 하드웨어 구성:
   - 메인 서버: Raspberry Pi (Node.js/Express)
   - 제어기 1 (Arduino 1): DHT11(온습도), SG90 서보모터 4개(전등 스위치 물리 제어)
   - 제어기 2 (Arduino 2): HC-SR04(초음파 센서 - 쓰레기통), KY-005(IR 송신 - 냉난방기 제어)
   - 직접 연결: 릴레이 모듈(GPIO 17) - 스마트 도어락

2. 소프트웨어 스택:
   - Frontend: React, Tailwind CSS, Socket.io-client (Apple-style Widget UI)
   - Backend: Node.js, Express, MySQL, SerialPort, Socket.io
   - Database: MySQL (기기 상태 로그 및 전력 사용량 계산용 데이터 저장)
   - AI: Python 기반 AI 에너지 코치 모델 연동

3. 주요 기능 로직:
   - 전력 사용량: 전등(10W), 냉난방기(1500W 기반 동적 계산)의 사용 시간을 DB 로그로 추적하여 실시간 계산 및 누진세 적용 요금 예측.
   - 에너지 어드바이저: 실외 기온(Open-Meteo API)과 현재 전력 소비량을 비교하여 효율성 가이드 제공.
   - 스마트 자동화: 설정 온도 및 시간에 따른 기기 자동 제어.

### [보고서 목차 및 작성 지침]

1. Project Overview: 프로젝트 목적과 통합 관리의 이점을 기술.
2. Roadmap & Achievement: 계획 대비 100% 달성 완료 강조.
3. System Diagram: 텍스트 기반 구성도(Tree 형태)로 하드웨어와 소프트웨어 흐름 기술.
4. Hardware Components: 각 부품의 역할과 핀 맵(DHT11-D6, Sonar-D2/D4, Servo-D2/3/8/9, IR-D3 등) 상세 기록.
5. Software Architecture: React 대시보드와 Node.js 서버, MySQL의 유기적 연결 설명.
6. Implementation Details: 도어락(GPIO), 전등(Servo), 냉난방기(IR) 등의 구체적 제어 방식 기술.
7. Results: 모든 기능의 정상 동작과 사용자 경험(UX) 최적화 강조.
8. Arduino Source Code: 아래 제공하는 아두이노 코드 1과 2를 포함하고, 각 라인에 전문가 수준의 한글 주석을 상세히 달아주세요.
9. Team Contribution: 팀장(시스템 통합), 팀원A(프론트엔드), 팀원B(백엔드), 팀원C(하드웨어)로 나누어 기여도 작성.
10. Conclusion: 배운 점(IoT 풀스택 경험)과 향후 발전 방향(AI 고도화 등)으로 마무리.

### [첨부 데이터: 아두이노 소스 코드]

**코드 1 (Lights & DHT11)**
```cpp
[여기에 arduino/1.ino 파일의 내용을 복사해서 붙여넣으세요]
```

**코드 2 (Sonar & IR AC Control)**
```cpp
[여기에 arduino/2.ino 파일의 내용을 복사해서 붙여넣으세요]
```

위 내용을 바탕으로 보고서를 한글로 완벽하게 작성해 주세요.
