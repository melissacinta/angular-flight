import { Component } from '@angular/core';
import { OpenskyApiService } from '../../services/opensky-api.service';
import { forkJoin, of as observableOf } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Flight {
  airport: string;
  time: number;
  arriving: number;
  departing: number;
}

@Component({
  selector: 'app-dashbord',
  templateUrl: './dashbord.component.html',
})
export class DashbordComponent {
  begin = Math.floor(Date.now() / 1000) - 7200;
  end = Math.floor(Date.now() / 1000);
  isLoading: boolean = true;
  flights: Flight[] = [];
  page = 0;
  startIndex: number;
  endIndex: number;

  constructor(private openskyApiService: OpenskyApiService) {}

  ngOnInit() {
    this.getFlights();
  }

  private getFlights() {
    forkJoin({
      flights: this.openskyApiService.getAllFlights(this.begin, this.end),
    })
      .pipe(
        catchError(() => observableOf(null)),
        map(({ flights }: { flights: any[] }) => {
          // Flip flag to show that loading has finished.
          this.isLoading = false;
          // Gets all departing flight
          const depAirports = flights.reduce((acc, flight) => {
            if (flight.estDepartureAirport) {
              const index = acc.findIndex(
                (a) => a.airport === flight.estDepartureAirport
              );
              if (index === -1) {
                acc.push({
                  airport: flight.estDepartureAirport,
                  time: flight.lastSeen,
                  departing: 1,
                });
              } else {
                acc[index].departing += 1;
              }
            }
            return acc;
          }, []);
          // Gets all arriving flight
          const arrAirports = flights.reduce((acc, flight) => {
            if (flight.estArrivalAirport) {
              const index = acc.findIndex(
                (a) => a.airport === flight.estArrivalAirport
              );
              if (index === -1) {
                acc.push({
                  airport: flight.estArrivalAirport,
                  time: flight.lastSeen,
                  arriving: 1,
                });
              } else {
                acc[index].arriving += 1;
              }
            }
            return acc;
          }, []);
          // Merge them
          const mergedArr = [...arrAirports, ...depAirports].reduce(
            (acc, airport) => {
              const {
                airport: code,
                time,
                arriving = 0,
                departing = 0,
              } = airport;
              const entry = acc[code] || {
                airport: code,
                time,
                arriving: 0,
                departing: 0,
              };
              return {
                ...acc,
                [code]: {
                  ...entry,
                  arriving: entry.arriving + arriving,
                  departing: entry.departing + departing,
                },
              };
            },
            {}
          );
          return Object.values(mergedArr);
        })
      )
      .subscribe((data: Flight[]) => {
        this.flights = data.sort((x, y) => x.time - y.time);
        this.calculateIndices();
      });
  }
  handlePageChange = (str: string) => {
    console.log({ str });

    if (str === 'prev') {
      this.page--;
    } else {
      this.page++;
    }
    this.calculateIndices();
  };
  calculateIndices = () => {
    this.startIndex = this.page * 10 + 1;
    this.endIndex = Math.min(this.startIndex + 10 - 1, this.flights?.length);
  };
}
