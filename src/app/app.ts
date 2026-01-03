import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PDFDocument, rgb } from 'pdf-lib';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  attendanceForm: FormGroup;
  isLoading = false;
  private firestore: Firestore = inject(Firestore);

  constructor(private fb: FormBuilder) {
    this.attendanceForm = this.fb.group({
      congregationName: ['', [Validators.required]],
      month: ['', [Validators.required]],
      weeks: this.fb.group({
        week1: this.fb.group({
          midweek: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]],
          weekend: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]]
        }),
        week2: this.fb.group({
          midweek: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]],
          weekend: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]]
        }),
        week3: this.fb.group({
          midweek: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]],
          weekend: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]]
        }),
        week4: this.fb.group({
          midweek: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]],
          weekend: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]]
        }),
        week5: this.fb.group({
          midweek: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]],
          weekend: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]]
        })
      }),
      totals: this.fb.group({
        midweek: new FormControl({ value: 0, disabled: true }),
        weekend: new FormControl({ value: 0, disabled: true })
      }),
      averages: this.fb.group({
        midweek: new FormControl({ value: 0, disabled: true }),
        weekend: new FormControl({ value: 0, disabled: true })
      })
    });
  }

  ngOnInit() {
    this.attendanceForm.get('weeks')?.valueChanges.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.calculate();
      this.saveToFirestore();
    });

    // Load initial data if possible
    this.loadFromFirestore();
  }

  async saveToFirestore() {
    const formValue = this.attendanceForm.getRawValue();
    const docId = this.getDocumentId(formValue);
    
    if (!docId) return;

    try {
      await setDoc(doc(this.firestore, 'reports', docId), {
        ...formValue,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('Saved to Firestore');
    } catch (error) {
      console.error('Error saving to Firestore:', error);
    }
  }

  async loadFromFirestore() {
    const lastDocId = localStorage.getItem('lastReportId');
    if (lastDocId) {
      this.isLoading = true;
      try {
        const docSnap = await getDoc(doc(this.firestore, 'reports', lastDocId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          this.attendanceForm.patchValue(data, { emitEvent: false });
          this.calculate();
        }
      } catch (error) {
        console.error('Error loading:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  private getDocumentId(formValue: any): string {
    const name = formValue.congregationName?.trim().toLowerCase().replace(/\s+/g, '_');
    const month = formValue.month?.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (name && month) {
      const id = `${name}_${month}`;
      localStorage.setItem('lastReportId', id);
      return id;
    }
    
    let lastId = localStorage.getItem('lastReportId');
    if (!lastId) {
      lastId = 'draft_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('lastReportId', lastId);
    }
    return lastId;
  }

  onBlur() {
    this.saveToFirestore();
  }

  calculate() {
    const weeks = this.attendanceForm.get('weeks')?.value;
    const midweekValues = Object.values(weeks).map((week: any) => week.midweek).filter(v => typeof v === 'number' && v > 0);
    const weekendValues = Object.values(weeks).map((week: any) => week.weekend).filter(v => typeof v === 'number' && v > 0);

    const midweekSum = midweekValues.reduce((sum, v) => sum + v, 0);
    const weekendSum = weekendValues.reduce((sum, v) => sum + v, 0);

    this.attendanceForm.get('totals.midweek')?.setValue(midweekSum);
    this.attendanceForm.get('totals.weekend')?.setValue(weekendSum);

    const midweekAvg = midweekValues.length > 0 ? Math.round(midweekSum / midweekValues.length) : 0;
    const weekendAvg = weekendValues.length > 0 ? Math.round(weekendSum / weekendValues.length) : 0;

    this.attendanceForm.get('averages.midweek')?.setValue(midweekAvg);
    this.attendanceForm.get('averages.weekend')?.setValue(weekendAvg);
  }

  async downloadPDF() {
    if (!this.attendanceForm.get('congregationName')?.valid || !this.attendanceForm.get('month')?.valid) {
      alert('Por favor, complete el nombre de la congregación y el mes.');
      return;
    }

    this.isLoading = true;
    try {
      const formValue = this.attendanceForm.getRawValue();

      // Load the PDF
      const response = await fetch('/S-3_S.pdf');
      const arrayBuffer = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Assuming positions based on typical PDF layout; adjust as needed
      // These are placeholder coordinates; in a real scenario, you'd need to map exact positions
      firstPage.drawText(formValue.congregationName, { x: 125, y: 150, size: 12, color: rgb(0, 0, 0) });
      firstPage.drawText(formValue.month, { x: 245, y: 150, size: 12, color: rgb(0, 0, 0) });

      // Weeks data - approximate positions
      const weekData = [
        formValue.weeks.week1,
        formValue.weeks.week2,
        formValue.weeks.week3,
        formValue.weeks.week4,
        formValue.weeks.week5
      ];

      // Replace null with 0 for PDF
      weekData.forEach(week => {
        week.midweek = week.midweek || 0;
        week.weekend = week.weekend || 0;
      });
      formValue.totals.midweek = formValue.totals.midweek || 0;
      formValue.totals.weekend = formValue.totals.weekend || 0;
      formValue.averages.midweek = formValue.averages.midweek || 0;
      formValue.averages.weekend = formValue.averages.weekend || 0;

      // Semana 1
      firstPage.drawText(weekData[0].midweek.toString(), { x: 65, y: 90, size: 12, color: rgb(0, 0, 0) });
      firstPage.drawText(weekData[0].weekend.toString(), { x: 65, y: 50, size: 12, color: rgb(0, 0, 0) });

      // Semana 2
      firstPage.drawText(weekData[1].midweek.toString(), { x: 100, y: 90, size: 12, color: rgb(0, 0, 0) });
      firstPage.drawText(weekData[1].weekend.toString(), { x: 100, y: 50, size: 12, color: rgb(0, 0, 0) });

      // Semana 3
      firstPage.drawText(weekData[2].midweek.toString(), { x: 138, y: 90, size: 12, color: rgb(0, 0, 0) });
      firstPage.drawText(weekData[2].weekend.toString(), { x: 138, y: 50, size: 12, color: rgb(0, 0, 0) });

      // Semana 4
      firstPage.drawText(weekData[3].midweek.toString(), { x: 175, y: 90, size: 12, color: rgb(0, 0, 0) });
      firstPage.drawText(weekData[3].weekend.toString(), { x: 175, y: 50, size: 12, color: rgb(0, 0, 0) });

      // Semana 5
      firstPage.drawText(weekData[4].midweek.toString(), { x: 210, y: 90, size: 12, color: rgb(0, 0, 0) });
      firstPage.drawText(weekData[4].weekend.toString(), { x: 210, y: 50, size: 12, color: rgb(0, 0, 0) });

      // Totals
      firstPage.drawText(formValue.totals.midweek.toString(), { x: 245, y: 90, size: 12, color: rgb(0, 0, 0) });
      firstPage.drawText(formValue.totals.weekend.toString(), { x: 245, y: 50, size: 12, color: rgb(0, 0, 0) });

      // Averages
      firstPage.drawText(formValue.averages.midweek.toString(), { x: 280, y: 90, size: 12, color: rgb(0, 0, 0) });
      firstPage.drawText(formValue.averages.weekend.toString(), { x: 280, y: 50, size: 12, color: rgb(0, 0, 0) });

      const pdfBytes = await pdfDoc.save();

      // Share via WhatsApp or general share
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const file = new File([blob], 'Informe_Asistencia_Rellenado.pdf', { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Informe de Asistencia a Reuniones',
            text: 'Adjunto el informe de asistencia generado.',
            files: [file]
          });
        } catch (error) {
          console.error('Error sharing:', error);
          // Fallback: download
          this.downloadBlob(blob);
        }
      } else {
        // Fallback: download and suggest sharing manually
        this.downloadBlob(blob);
        alert('El navegador no soporta compartir archivos directamente. El PDF se ha descargado. Puedes compartirlo manualmente por WhatsApp.');
      }
    } catch (error) {
      console.error('Error in downloadPDF:', error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      this.isLoading = false;
    }
  }

  private downloadBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Informe_Asistencia_Rellenado.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }
}

