import { BookOpenCheck, FileSignature, Layers, ListChecks, Printer, Workflow } from 'lucide-react'
import Card from '../components/Card'
import { useStore } from '../data/store'
import { approvalMatrix } from '../lib/format'
import type { DeptGroup, DocLevel } from '../types'

/**
 * เนื้อหาสรุปของเอกสารแม่บท QM-QMR-001-1
 * "การจัดทำและควบคุมเอกสารคุณภาพ" ศูนย์คุณภาพ โรงพยาบาลปาย
 * แสดงในแอปเพื่อให้ผู้ใช้ทุกหน่วยเข้าถึงกติกากลางได้เสมอ (วัตถุประสงค์ 1.3)
 */
export default function Manual() {
  const depts = useStore((s) => s.departments)
  const groups: DeptGroup[] = ['ศูนย์คุณภาพ', 'คณะกรรมการ', 'กลุ่มงาน', 'องค์กร', 'งานการพยาบาล']

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white shadow-md">
        <div className="flex items-center gap-3">
          <BookOpenCheck size={28} />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-100">คู่มือคุณภาพ (Quality Manual)</div>
            <h1 className="text-xl font-bold">การจัดทำและควบคุมเอกสารคุณภาพ</h1>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
          <HeaderStat label="รหัสเอกสาร" value="QM-QMR-001-1" mono />
          <HeaderStat label="ผู้จัดทำ" value="ภก.ปฏิภาณ คำมาเร็ว" />
          <HeaderStat label="ผู้ทบทวน" value="นางอุไรพร วิเศษสมิต" />
          <HeaderStat label="ผู้อนุมัติ" value="นพ.วัฒนชัย วิเศษสมิต (ผอ.รพ.)" />
        </div>
        <div className="mt-2 text-xs text-brand-100">ทบทวน/แก้ไขครั้งที่ 1 · อนุมัติใช้ 25 พฤศจิกายน 2568</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={<span className="inline-flex items-center gap-2"><ListChecks size={16} className="text-brand-600" /> วัตถุประสงค์ (ข้อ 1)</span>}>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            <li>กำหนดมาตรฐานรูปแบบ เนื้อหา และโครงสร้างเอกสารให้เป็นเอกภาพทั้งองค์กร</li>
            <li>เอกสารทุกฉบับถูกต้อง ครบถ้วน เป็นปัจจุบัน และผ่านการอนุมัติก่อนเผยแพร่</li>
            <li>ควบคุมการแจกจ่ายและการเข้าถึง — ผู้ปฏิบัติงานได้ใช้ฉบับล่าสุดเสมอ</li>
            <li>ติดตาม ตรวจสอบ ทวนสอบได้ว่าใครจัดทำ ตรวจทาน อนุมัติ แก้ไข</li>
            <li>สร้างความเข้าใจและวินัยการจัดการเอกสารแก่บุคลากรทุกระดับ</li>
            <li>ป้องกันความสับสน ลดความผิดพลาดจากการใช้เอกสารไม่เป็นทางการ</li>
            <li>สนับสนุนการปรับปรุงคุณภาพอย่างต่อเนื่อง</li>
          </ul>
        </Card>

        <Card title={<span className="inline-flex items-center gap-2"><Layers size={16} className="text-brand-600" /> ระดับเอกสารคุณภาพ 4 ระดับ (ข้อ 4.5)</span>}>
          <div className="space-y-2">
            <TierRow tier="1" code="QM" name="คู่มือคุณภาพ (Quality Manual)" desc="เอกสารระดับสูงสุด แสดงเจตนารมณ์ผู้บริหาร ขอบเขตระบบคุณภาพ และใช้อ้างอิงการตรวจประเมิน" color="bg-violet-100 text-violet-700" />
            <TierRow tier="2" code="SOP" name="แนวทางปฏิบัติ (Standard Operating Procedure)" desc="กำหนดขั้นตอน วิธีการ แนวทางของแต่ละกระบวนการ ให้การดำเนินงานเป็นแนวเดียวกัน" color="bg-blue-100 text-blue-700" />
            <TierRow tier="3" code="WI" name="วิธีปฏิบัติงาน (Work Instruction)" desc="อธิบายขั้นตอนละเอียดระดับปฏิบัติการ ใช้คู่กับ SOP ในงานเฉพาะด้าน" color="bg-sky-100 text-sky-700" />
            <TierRow tier="4" code="FM" name="แบบฟอร์ม (Forms)" desc="บันทึกผลการดำเนินงานจริงเป็นหลักฐานตรวจสอบย้อนกลับ ควบคุมและจัดเก็บตามกำหนด" color="bg-amber-100 text-amber-700" />
          </div>
        </Card>
      </div>

      <Card title={<span className="inline-flex items-center gap-2"><FileSignature size={16} className="text-brand-600" /> ระบบรหัสเอกสาร (ข้อ 5)</span>}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="rounded-xl bg-slate-900 px-4 py-5 text-center">
              <div className="font-mono text-2xl font-bold tracking-widest text-emerald-400">AAA–BBB–XXX–YY</div>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <CodePart k="AAA" v="รูปแบบเอกสาร — QM / SOP / WI / FM" />
              <CodePart k="BBB" v="คณะกรรมการ/หน่วยงานผู้จัดทำ (ตารางด้านขวา)" />
              <CodePart k="XXX" v="ลำดับที่ของเอกสาร (ตัวเลข 3 หลัก)" />
              <CodePart k="YY" v="ครั้งที่ของการแก้ไขเอกสาร" />
            </dl>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <div className="font-semibold text-slate-700">ตัวอย่าง</div>
              <div className="font-mono">SOP-QMR-001-1</div> แนวทางปฏิบัติของคณะกรรมการระบบคุณภาพ ลำดับที่ 1 ฉบับที่ 1
              <div className="mt-1 font-mono">FM-QMR-003-2</div> แบบฟอร์มของคณะกรรมการระบบคุณภาพ ลำดับที่ 3 ฉบับที่ 2
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-500">ตารางอักษรย่อของคณะกรรมการ/สาขาวิชา/หน่วยงาน ({depts.length} หน่วย)</div>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-2 scrollbar-thin">
              {groups.map((g) => {
                const list = depts.filter((d) => d.group === g)
                if (list.length === 0) return null
                return (
                  <div key={g}>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g}</div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {list.map((d) => (
                        <div key={d.code} className="flex items-baseline gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs">
                          <span className="w-10 shrink-0 font-mono font-bold text-brand-700">{d.code}</span>
                          <span className="text-slate-600">{d.nameTh}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card title="ผู้รับผิดชอบในการจัดทำ ตรวจสอบ และอนุมัติเอกสาร (หน้า 8)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">เอกสาร</th>
                <th className="px-3 py-2">คณะผู้จัดทำ/แก้ไข/ยกเลิก</th>
                <th className="px-3 py-2">ผู้ตรวจสอบ</th>
                <th className="px-3 py-2">ผู้อนุมัติ</th>
                <th className="px-3 py-2">ผู้แจกจ่าย/เรียกคืน/ทำลาย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.keys(approvalMatrix) as Array<Exclude<DocLevel, 'EXT'>>).map((l) => (
                <tr key={l}>
                  <td className="px-3 py-2 font-mono font-bold text-brand-700">{l}</td>
                  <td className="px-3 py-2">{approvalMatrix[l].prepare}</td>
                  <td className="px-3 py-2">{approvalMatrix[l].review}</td>
                  <td className="px-3 py-2">{approvalMatrix[l].approve}</td>
                  <td className="px-3 py-2 font-semibold text-brand-700">QMR</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={<span className="inline-flex items-center gap-2"><Workflow size={16} className="text-brand-600" /> ขั้นตอนการจัดทำและควบคุมเอกสาร (ข้อ 6)</span>}>
        <ol className="relative space-y-5 border-l-2 border-brand-100 pl-6">
          <FlowStep n="6.1" title="การขอออกเอกสารในระบบคุณภาพ">
            ผู้จัดทำร่างเอกสารตามรูปแบบมาตรฐาน (7 หัวข้อ) → ยื่น <b>ใบขอขึ้นทะเบียน FM-QMR-001</b> →
            คณะกรรมการระบบคุณภาพตรวจสอบความซ้ำซ้อน กำหนดรหัส และลงทะเบียนใน <b>บัญชีรายการเอกสารคุณภาพ FM-QMR-002</b>
          </FlowStep>
          <FlowStep n="6.2" title="นำเสนอผู้มีอำนาจลงนาม">
            หลังอนุมัติ ประทับตรา <b>"เอกสารต้นฉบับ"</b> เก็บที่ศูนย์คุณภาพ — เอกสารที่อนุมัติแล้วถือเป็น <b>"เอกสารควบคุม"</b> จึงทำสำเนาแจกจ่ายได้
          </FlowStep>
          <FlowStep n="6.3" title="การจัดเก็บของผู้ถือครองเอกสาร">
            จัดเก็บ ณ จุดปฏิบัติงานที่ผู้ปฏิบัติงานเข้าถึงได้ เพื่อใช้ศึกษาประกอบการทำงาน
          </FlowStep>
          <FlowStep n="6.4" title="การขอแก้ไข / ยกเลิกเอกสาร">
            ยื่น FM-QMR-001 พร้อมเหตุผล → เมื่ออนุมัติ ศูนย์คุณภาพเรียกเก็บฉบับเก่าคืน ·
            <b> กรณียกเลิก</b>: ประทับตรา "ยกเลิก" หมึกแดงทุกหน้า เก็บต้นฉบับ 1 ปีนับจากวันยกเลิกแล้วทำลาย ·
            <b> กรณีแก้ไข</b>: ออกรหัสครั้งที่แก้ไขใหม่ (YY+1) หน้าที่ถูกแก้ไขเรียกกลับและทำลายโดยศูนย์คุณภาพ
          </FlowStep>
        </ol>
      </Card>

      <Card title={<span className="inline-flex items-center gap-2"><Printer size={16} className="text-brand-600" /> รูปแบบการเขียนและการพิมพ์ (ภาคผนวก 7.4–7.5)</span>}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500">หัวข้อที่ต้องมีในเอกสาร</div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>วัตถุประสงค์ — เหตุผลและเป้าหมายของเอกสาร</li>
              <li>ขอบเขต — ใช้กับหน่วยงาน/ขั้นตอน/บุคลากรกลุ่มใด</li>
              <li>หน้าที่และความรับผิดชอบ — ใครทำ ตรวจ อนุมัติ</li>
              <li>คำจำกัดความ — คำเฉพาะ/คำย่อที่ใช้</li>
              <li>รายละเอียด/ขั้นตอนการปฏิบัติ — เรียงลำดับปฏิบัติตามได้ทันที</li>
              <li>เอกสารอ้างอิง — กฎหมาย มาตรฐาน แนวปฏิบัติที่เกี่ยวข้อง</li>
              <li>ภาคผนวก — แบบฟอร์ม ตาราง ผังงาน ตัวอย่าง</li>
            </ol>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <div className="mb-1 text-xs font-semibold text-slate-500">ข้อกำหนดการพิมพ์</div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div>ตั้งค่าหน้ากระดาษ: บน-ล่าง <b>1.91 ซม.</b> ซ้าย-ขวา <b>2.54 ซม.</b></div>
              <div className="mt-1">พิมพ์ด้วย Microsoft Word · Font <b>TH Sarabun New ขนาด 16</b> · หัวข้อพิมพ์ตัวหนา</div>
              <div className="mt-1">หลังอนุมัติ ส่งเอกสารพร้อมไฟล์ข้อมูลมาที่ศูนย์คุณภาพ</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

const HeaderStat = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
    <div className="text-[10px] uppercase tracking-wide text-brand-100">{label}</div>
    <div className={'text-sm font-semibold ' + (mono ? 'font-mono' : '')}>{value}</div>
  </div>
)

const TierRow = ({ tier, code, name, desc, color }: { tier: string; code: string; name: string; desc: string; color: string }) => (
  <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
    <span className={`grid h-9 w-12 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold ${color}`}>{code}</span>
    <div className="leading-tight">
      <div className="text-sm font-semibold">ระดับที่ {tier} · {name}</div>
      <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
    </div>
  </div>
)

const CodePart = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-baseline gap-3">
    <dt className="w-12 shrink-0 font-mono text-sm font-bold text-brand-700">{k}</dt>
    <dd className="text-sm text-slate-600">{v}</dd>
  </div>
)

const FlowStep = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <li>
    <span className="absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{n}</span>
    <div className="text-sm font-semibold">{title}</div>
    <p className="mt-1 text-sm leading-relaxed text-slate-600">{children}</p>
  </li>
)
