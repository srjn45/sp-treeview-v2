import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SpTreeviewOverlayComponent } from './sp-treeview-overlay.component';

describe('SpTreeviewOverlayComponent', () => {
  let component: SpTreeviewOverlayComponent;
  let fixture: ComponentFixture<SpTreeviewOverlayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SpTreeviewOverlayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SpTreeviewOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
