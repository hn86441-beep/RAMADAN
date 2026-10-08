# ختمة رمضان
موقع Vercel مع قاعدة بيانات Upstash Redis ولوحة تحكم للمشرف.

## الإعداد
1. ارفع الملفات إلى GitHub (مع مجلد api) ثم استورد المستودع في Vercel.
2. من مشروعك في Vercel: Storage > Create > اختر Upstash Redis > اربطها بالمشروع.
3. Settings > Environment Variables: أضف ADMIN_PASSWORD وقيمته كلمة سر المشرف.
4. Deployments > Redeploy.

## العمل بدون إنترنت
الموقع تطبيق PWA: يُثبَّت على الهاتف ويعمل دون إنترنت. تعديلات المشرف تُحفظ على الجهاز وتُرفع تلقائياً عند عودة الاتصال.
