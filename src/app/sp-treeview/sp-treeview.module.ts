import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

import { SpTreeviewNodeComponent } from './sp-treeview-node/sp-treeview-node.component';
import { SpTreeviewComponent } from './sp-treeview/sp-treeview.component';
import { SpTreeviewOverlayComponent } from './sp-treeview-overlay/sp-treeview-overlay.component';
import { SpTreeviewDropdownComponent } from './sp-treeview-dropdown/sp-treeview-dropdown.component';

@NgModule({
  imports: [
    CommonModule,
    // BrowserAnimationsModule must be provided by the consuming app,
    // not by this library module — see https://angular.dev/guide/animations
    MatProgressBarModule,
    MatCheckboxModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatDividerModule,
  ],
  declarations: [
    SpTreeviewNodeComponent,
    SpTreeviewComponent,
    SpTreeviewOverlayComponent,
    SpTreeviewDropdownComponent,
  ],
  exports: [
    SpTreeviewComponent,
    SpTreeviewOverlayComponent,
    SpTreeviewDropdownComponent,
  ],
})
export class SpTreeviewModule { }
