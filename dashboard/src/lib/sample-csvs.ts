/**
 * Sample bank SMS CSV fixtures for Mawazin bulk-import column-mapping tests.
 * Each fixture simulates a different bank export format with distinct column
 * names, orderings, and date formats.
 */

// ---------------------------------------------------------------------------
// STC Bank — columns: Sender, Received, Body
// Date format: DD-Mon-YYYY HH:MM:SS
// ---------------------------------------------------------------------------
export const STC_BANK_SAMPLE = `Sender,Received,Body
STC Bank,15-Apr-2026 09:14:02,"تم الشراء بمبلغ SAR 235.00 من LULU HYPERMARKET بطاقتك *5492 في 15/04/2026"
STC Bank,14-Apr-2026 18:45:31,"Purchase of SAR 89.50 at NOON.COM using card *5492 on 14/04/2026"
STC Bank,14-Apr-2026 12:30:10,"تم تحويل مبلغ SAR 1,500.00 إلى حساب IBAN SA2800400101234567891234 بطاقتك *5492"
STC Bank,13-Apr-2026 08:22:55,"Transfer of SAR 500.00 received from Ahmed Al-Harbi Ref#TXN20260413001"
STC Bank,12-Apr-2026 20:10:44,"تم الشراء بمبلغ SAR 45.75 من CAREEM بطاقتك *5492 في 12/04/2026"
STC Bank,11-Apr-2026 14:55:12,"Purchase of SAR 312.00 at JARIR BOOKSTORE using card *5492 on 11/04/2026"
STC Bank,10-Apr-2026 11:03:28,"تم سحب مبلغ SAR 2,000.00 من الصراف الآلي رقم ATM#0047 بطاقتك *5492"
STC Bank,09-Apr-2026 07:48:37,"OTP for your STC Bank transaction is 847391. Valid for 5 minutes. Do not share."
`;

// ---------------------------------------------------------------------------
// Apple Messages export — columns: timestamp, sender, text
// Date format: ISO 8601 with timezone offset
// Some text fields contain commas (properly quoted)
// ---------------------------------------------------------------------------
export const APPLE_MESSAGES_SAMPLE = `timestamp,sender,text
2026-04-15T09:14:02+03:00,STC-Bank,"تم الشراء بمبلغ SAR 235.00 من LULU HYPERMARKET بطاقتك *5492"
2026-04-14T18:45:31+03:00,Al-Rajhi,"Purchase SAR 1,200.00 at IKEA RIYADH card XX2838 — please verify"
2026-04-14T12:30:10+03:00,SABB,"تم تحويل SAR 750.00 إلى محفظة STC Pay, المرجع: REF20260414-7823"
2026-04-13T08:22:55+03:00,SNB,"Transfer received: SAR 3,000.00 from Khalid Al-Otaibi, Ref#SNB-2026-04-13-9921"
2026-04-12T20:10:44+03:00,Al-Rajhi,"تم الشراء بمبلغ SAR 88.00 من STARBUCKS MALL OF ARABIA, بطاقتك XX2838"
2026-04-11T14:55:12+03:00,STC-Bank,"Declined: SAR 5,000.00 at ELECTRONICS STORE — insufficient funds, card *5492"
2026-04-10T11:03:28+03:00,SABB,"Cash withdrawal SAR 1,000.00 from ATM #SABB-0312, balance SAR 8,452.30"
2026-04-09T07:48:37+03:00,SNB,"رمز التحقق الخاص بك هو 614729, صالح لمدة 5 دقائق. لا تشاركه مع أحد."
`;

// ---------------------------------------------------------------------------
// Generic bank export — columns: Date, From, Message, Extra Column
// Date format: dd/mm/yyyy
// Extra Column tests the "ignore" mapping path
// ---------------------------------------------------------------------------
export const GENERIC_BANK_SAMPLE = `Date,From,Message,Extra Column
15/04/2026,Arab National Bank,"تم خصم SAR 175.50 من حسابك بسبب شراء من AMAZON.SA بطاقة *9934",PROCESSED
14/04/2026,Arab National Bank,"Card *9934 purchase SAR 430.00 at DANUBE HYPERMARKET approved",PROCESSED
14/04/2026,Arab National Bank,"تحويل صادر SAR 2,000.00 إلى حساب رقم SA4420000001234567891234 تم بنجاح",PROCESSED
13/04/2026,Arab National Bank,"Incoming transfer SAR 5,500.00 from Mohammed Al-Zahrani Ref#ANB20260413",SETTLED
12/04/2026,Arab National Bank,"تم الشراء بمبلغ SAR 99.00 من NETFLIX.COM بطاقتك *9934 في 12/04/2026",PROCESSED
11/04/2026,Arab National Bank,"Card *9934 declined at PETROL STATION — daily limit reached. Call 920001234.",DECLINED
10/04/2026,Arab National Bank,"رصيدك الحالي SAR 12,840.75. تم إضافة فائدة شهرية SAR 18.22 بتاريخ 10/04/2026",POSTED
09/04/2026,Arab National Bank,"Your ANB one-time password is 293847. Expires in 3 minutes. Never share this code.",USED
`;
