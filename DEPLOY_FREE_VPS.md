# Deploy `kqxs.shadowdev.vn` lên VPS + Telegram hằng ngày

## Phương án hạ tầng

Khuyến nghị cho dự án này là **Oracle Cloud Always Free – Ampere A1** với một VM Ubuntu ARM, 2 OCPU và 6–12 GB RAM. Oracle hiện công bố hạn mức Always Free tương đương tổng 2 OCPU và 12 GB RAM cho A1; tài nguyên phải được tạo ở home region và có thể tạm hết capacity. Oracle cũng nêu rõ VM Always Free nhàn rỗi có thể bị thu hồi, vì vậy cần bật health monitoring và backup cấu hình. Nguồn: [OCI Free Tier](https://docs.oracle.com/iaas/Content/FreeTier/freetier.htm), [Always Free compute limits](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

Phương án dự phòng là Google Cloud Free Tier `e2-micro`, nhưng VM chỉ có hạn mức miễn phí tại một số region Mỹ và RAM nhỏ hơn đáng kể; phù hợp hơn nếu image được build ở máy khác. Nguồn: [Google Cloud Free Program](https://docs.cloud.google.com/free/docs/free-cloud-features).

## Kiến trúc chạy

- `web`: Next.js standalone, chỉ bind `127.0.0.1:3000` trên VPS.
- `scheduler`: chạy múi giờ `Asia/Ho_Chi_Minh` lúc 18:45, retry 19:05 và repair 05:30.
- PostgreSQL: dùng `DATABASE_URL` bên ngoài; không mở PostgreSQL công khai nếu không cần.
- Telegram: báo kết quả đã xác minh, đối chiếu snapshot gốc và chỉ phát nhánh đạt ngưỡng bằng chứng.
- `cloudflared` (tùy chọn): public website qua kết nối outbound, không cần mở port web. Cloudflare yêu cầu account và domain cho production tunnel. Nguồn: [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/), [setup bằng Docker](https://developers.cloudflare.com/tunnel/setup/).

## 1. Chuẩn bị VPS

Tạo Ubuntu 24.04 ARM64 trên Oracle A1. Chỉ mở SSH từ IP quản trị. Cài Docker Engine và Compose plugin theo [hướng dẫn Docker chính thức](https://docs.docker.com/compose/install/linux/).

Chuyển source lên `/opt/kqxs`. Không chuyển `.env`, `.next`, `node_modules`, `logs` hoặc `backups` từ máy local. Nếu chưa có Git remote, có thể dùng `rsync` từ máy local:

```bash
rsync -az \
  --exclude .env \
  --exclude .next \
  --exclude node_modules \
  --exclude logs \
  --exclude backups \
  /Volumes/Namdev23/kqxs/ ubuntu@VPS_IP:/opt/kqxs/
```

## 2. Cấu hình bí mật

Trên VPS:

```bash
cd /opt/kqxs
cp .env.example .env
chmod 600 .env
nano .env
```

Các biến bắt buộc:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/kqxs?schema=public"
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://kqxs.shadowdev.vn

TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TELEGRAM_MIN_EDGE_STATUS=qualified
TELEGRAM_SILENT=false
```

Khi PostgreSQL chạy ngay trên VPS bằng file override `deploy/docker-compose.vps.yml`, thêm:

```dotenv
POSTGRES_USER=kqxs
POSTGRES_PASSWORD=<mật-khẩu-ngẫu-nhiên-dài>
POSTGRES_DB=kqxs
DATABASE_URL="postgresql://kqxs:<cùng-mật-khẩu>@postgres:5432/kqxs?schema=public"
```

Không publish port `5432`; chỉ `web` và `scheduler` trong Docker network được kết nối.

`qualified` là mặc định an toàn: chỉ gửi số khi CI95/lift/sample gate đều đạt. Nếu đặt `watch`, bot sẽ gửi cả tín hiệu yếu và luôn gắn cảnh báo; không nên dùng `research_only` để ra quyết định.

Tạo bot qua `@BotFather`, gửi một tin nhắn cho bot rồi lấy `chat.id` từ `getUpdates`. Token phải được giữ như mật khẩu. Tham khảo [Telegram bot tutorial](https://core.telegram.org/bots/tutorial) và [Bot API](https://core.telegram.org/bots/api).

## 3. Build, đồng bộ dữ liệu và kiểm tra

```bash
cd /opt/kqxs
docker compose -f docker-compose.yml -f deploy/docker-compose.vps.yml build
docker compose -f docker-compose.yml -f deploy/docker-compose.vps.yml up -d postgres
docker compose -f docker-compose.yml -f deploy/docker-compose.vps.yml run --rm scheduler npm run db:push
docker compose -f docker-compose.yml -f deploy/docker-compose.vps.yml run --rm scheduler npm run daily:sync
docker compose -f docker-compose.yml -f deploy/docker-compose.vps.yml run --rm scheduler npm run data:audit
docker compose -f docker-compose.yml -f deploy/docker-compose.vps.yml run --rm scheduler npm test
docker compose -f docker-compose.yml -f deploy/docker-compose.vps.yml run --rm scheduler npm run test:telegram
docker compose -f docker-compose.yml -f deploy/docker-compose.vps.yml run --rm scheduler npm run model:backfill
docker compose -f docker-compose.yml -f deploy/docker-compose.vps.yml run --rm scheduler npm run model:review
```

`daily:sync` có ghi dữ liệu thật vào PostgreSQL và chỉ nhận kỳ được hai nguồn độc lập xác minh. Không tiếp tục deploy nếu `data:audit` hoặc smoke test báo dữ liệu chậm/sai cấu trúc.

`db:push` phải chạy trước scheduler khi deploy schema mới. Với database đang có dữ liệu, luôn tạo backup PostgreSQL trước bước này.

## 4. Khởi động

Chạy nội bộ, truy cập qua SSH tunnel:

```bash
docker compose up -d web scheduler
docker compose ps
curl http://127.0.0.1:3000/api/health
```

### Cách A — HTTPS trực tiếp bằng Caddy

Tạo DNS `A` cho `kqxs.shadowdev.vn` trỏ về IPv4 VPS (và `AAAA` nếu VPS có IPv6), rồi mở inbound TCP `80`, TCP/UDP `443`:

```bash
docker compose --profile caddy up -d web scheduler caddy
curl -fsS https://kqxs.shadowdev.vn/api/health
```

Caddy tự xin và gia hạn TLS. Không mở port `3000` ra Internet; web vẫn bind loopback trên host và Caddy truy cập qua Docker network.

### Cách B — Cloudflare Tunnel

Bật Cloudflare Tunnel sau khi tạo tunnel/hostname `kqxs.shadowdev.vn` trong dashboard và điền token:

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=...
```

```bash
docker compose --profile tunnel up -d
```

Map hostname về `http://web:3000` trong cấu hình tunnel. Cloudflare Tunnel tạo kết nối outbound nên không cần public port 3000.

Chỉ chọn một ingress (`caddy` hoặc `tunnel`) để cấu hình và vận hành đơn giản.

## 5. Vận hành

```bash
docker compose logs --tail=200 web
docker compose logs --tail=200 scheduler
docker compose ps
curl -fsS https://kqxs.shadowdev.vn/api/model-performance
```

Pipeline gửi tối đa một báo cáo cho cùng `resultDate + targetDate + snapshotHash`; lượt retry không gửi trùng. Nếu Telegram lỗi, pipeline trả lỗi để job 19:05 thử lại. Bot không gửi token/chat ID vào log.

Sau mỗi lần cập nhật code:

```bash
docker compose build
docker compose up -d
docker image prune -f
```

Sao lưu định kỳ PostgreSQL ở nơi khác VPS. VPS miễn phí không phải lớp lưu trữ duy nhất.

## Checklist go-live

- `/api/health` trả `database: connected`; `status: ready` khi dữ liệu mới không quá một ngày và có snapshot v6 cho hôm nay/ngày kế.
- `/api/model-performance` trả live monitor cùng tối đa 12 biên bản review tuần.
- `npm test` pass sau khi `daily:sync` hoàn tất.
- `.env` có permission `600`, không nằm trong image hoặc source transfer.
- Port 5432 không public; port 3000 chỉ bind loopback.
- Telegram dùng `qualified` trong ít nhất giai đoạn live tracking đầu tiên.
- Sau 30–60 snapshot live mới đánh giá lại model; không tune trọng số theo vài ngày thắng/thua.
