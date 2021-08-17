import { Component, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { ConnectorService } from '../../../../core/services/connector.service';
import {
  HttpClient,
  HttpEvent,
  HttpEventType,
  HttpResponseBase,
} from '@angular/common/http';
import { merge, Observable, Subject } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  pluck,
  shareReplay,
  skipWhile,
  take,
  takeUntil,
} from 'rxjs/operators';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { of } from 'rxjs/internal/observable/of';
import { tap } from 'rxjs/internal/operators/tap';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '../../../../core/services/notification.service';
import { PendingTransaction } from '../../../../core/models/types';
import { EthAuthService } from '../../../../core/services/eth-auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-card-admin-page',
  templateUrl: './card-admin-page.html',
  styleUrls: ['./card-admin-page.scss'],
})
export class CardAdminPage implements OnDestroy {
  baanxBaseUrl = 'http://localhost:3000';
  cardBaseUrl = environment.reefNodeApiUrl;
  accountCardRegistered$: Observable<boolean>;
  cardVerified$: Observable<boolean>;
  iframeSession$: Observable<any>;
  iframeUrl$: Observable<string>;
  createUser: Subject<any> = new Subject<any>();
  manageCard = false;
  destroyed$ = new Subject<void>();
  @ViewChild('cardFormDialog') cardFormDialog: TemplateRef<any>;

  constructor(
    public readonly connectorService: ConnectorService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private ethAuthService: EthAuthService,
    private http: HttpClient
  ) {
    const existingUser$ = connectorService.providerUserInfo$.pipe(
      switchMap((userInfo: any) =>
        userInfo
          ? this.http.get(this.cardBaseUrl + '/card/' + userInfo.address, {
              reportProgress: true,
            })
          : of({ error: 'No wallet connected' })
      ),
      tap((v) => console.log('existing u=', v)),
      catchError((e) => {
        console.log('Existing user err=', e);
        return of({ error: e.message });
      })
    );

    const newUserCreated$ = this.createUser.asObservable().pipe(
      tap((v) => console.log('c00', v)),
      map((u) => ({
        external_id: u.address,
        title: 'Mr',
        gender: 'M',
        addressLine1: '1 St Peters Square',
        addressLine2: '22 St Peters Square',
        cityOrTown: 'Manchester',
        countryName: 'USA',
        country_code: '+44',
        first_name: 'Bob',
        last_name: 'Dole',
        selected_country: 'GBR',
        email: 'bob.dole1@baanx.com',
        phone_number: '7597234866',
        house_number: 99,
        postcode: 'M202RH',
        dateOfBirth: '1980-01-01T00:00:00.000Z',
      })),
      switchMap((uData) =>
        this.ethAuthService.signCardApplication$(JSON.stringify(uData))
      ),
      switchMap((uData) =>
        this.http
          .post(this.cardBaseUrl + '/card', uData, {
            reportProgress: true,
          })
          .pipe(
            map((v: any) => {
              console.log('Created user=', v);
              if (!!v && !!v.error) {
                console.log('Error creating user', v);
                return v;
              }
              return !!v;
            }),
            catchError((e) => {
              console.log('err', e);
              return of({ error: e.message });
            })
          )
      )
    );
    const userData$ = merge(existingUser$, newUserCreated$).pipe(
      shareReplay(1)
    );
    // TODO display loading
    const loading$ = userData$.pipe(
      filter((v) => this.isRequestStatus(v)),
      map((event) => {
        switch (event.type) {
          case HttpEventType.Sent:
            console.log('Request sent!');
            return true;
            break;
          case HttpEventType.ResponseHeader:
            console.log('Response header received!');
            return true;
            break;
          case HttpEventType.UploadProgress:
            // const percentDone = Math.round(100 * event.loaded / event.total);
            console.log(`File is being uploaded.`);
            return true;
          case HttpEventType.DownloadProgress:
            // const kbLoaded = Math.round(event.loaded / 1024);
            console.log(`Download in progress!`);
            return true;
            break;
          case HttpEventType.Response:
            console.log('😺 Done!', event.body);
            return false;
        }
      }),
      distinctUntilChanged()
    );
    const baanxUser$ = userData$.pipe(
      filter((v) => !this.isRequestStatus(v)),
      tap((v) => console.log('existing u1=', v)),
      map((res: any) => (!!res && !res.error ? res : null)),
      shareReplay(1)
    );
    this.cardVerified$ = baanxUser$.pipe(
      map((user: any) => !!user && !!user.verification_state),
      shareReplay(1)
    );
    this.accountCardRegistered$ = baanxUser$.pipe(
      map((res) => !!res),
      shareReplay(1)
    );
    this.iframeSession$ = baanxUser$.pipe(
      switchMap((bUser: any) =>
        bUser
          ? this.http.post(this.cardBaseUrl + '/card/session', {
              reefCardId: bUser.external_id,
            })
          : of({ error: true })
      ),
      catchError((v) => {
        console.log('session error=', v);
        return of({ error: true });
      }),
      shareReplay(1)
    );
    this.iframeUrl$ = this.iframeSession$.pipe(
      map(
        (session) =>
          `${this.baanxBaseUrl}/iframe/${session.access_token}/${session.user_id}`
      ),
      shareReplay(1)
    );

    userData$
      .pipe(
        takeUntil(this.destroyed$),
        skipWhile((e) => !e || !e.error),
        pluck('error')
      )
      .subscribe((errMsg: any) => {
        this.dialog.closeAll();
        this.notificationService.showNotification(
          errMsg.message || errMsg,
          'Close',
          'error'
        );
      });
  }

  private isRequestStatus(v): boolean {
    // TODO find better solution for checking response
    return v instanceof HttpResponseBase || (!!v && !!v.type);
  }

  ngOnDestroy(): void {
    this.destroyed$.next(null);
  }

  openCardForm(): void {
    this.dialog
      .open(this.cardFormDialog, {})
      .afterClosed()
      .pipe(take(1))
      .subscribe((formData: boolean) => {
        if (formData) {
          // createUser.next({address: userInfo.address})
        }
      });
  }
}